package com.example.server.outbox

import com.example.server.config.properties.OutboxDispatcherProperties
import com.example.server.outbox.dto.PaymentCancelledSeatEventPayload
import com.example.server.outbox.dto.ReservationSeatEventPayload
import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.types.OutboxEventType
import com.example.server.outbox.types.OutboxHoldActionResult
import com.example.server.performance.PerformanceVenueSeatStompPublisher
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.util.UUID

@Component
@ConditionalOnProperty(
  prefix = "outbox.dispatcher",
  name = ["enabled"],
  havingValue = "true",
  matchIfMissing = true,
)
class OutboxEventDispatcher(
  private val outboxEventService: OutboxEventService,
  private val redisVenueSeatHoldService: RedisVenueSeatHoldService,
  private val performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher,
  private val reservationRepository: ReservationRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
  private val objectMapper: ObjectMapper,
  private val properties: OutboxDispatcherProperties,
) {
  private val log = LoggerFactory.getLogger(OutboxEventDispatcher::class.java)

  @Scheduled(fixedDelayString = "\${outbox.dispatcher.fixed-delay:1000}")
  fun dispatch() {
    repeat(properties.batchSize) {
      val event = outboxEventService.claimNext(properties.leaseMillis) ?: return
      dispatch(event)
    }
  }

  private fun dispatch(event: OutboxEvent) {
    val processingOwner = requireNotNull(event.processingOwner) { "Outbox 이벤트 처리 소유자가 없습니다." }

    runCatching {
      process(event)
    }.onSuccess {
      runCatching {
        outboxEventService.markPublished(
          eventId = event.id,
          processingOwner = processingOwner,
        )
      }.onFailure { exception ->
        log.error("Outbox 이벤트를 발행 완료 상태로 변경하지 못했습니다. eventId={}", event.eventId, exception)
      }
    }.onFailure { exception ->
      log.error(
        "Outbox 이벤트 처리에 실패했습니다. eventId={}, attempt={}",
        event.eventId,
        event.attemptCount,
        exception,
      )
      runCatching {
        outboxEventService.markFailed(
          eventId = event.id,
          processingOwner = processingOwner,
          exception = exception,
          maxAttempts = properties.maxAttempts,
          retryDelayMillis = properties.retryDelayMillis,
        )
      }.onFailure { markFailedException ->
        log.error("Outbox 이벤트 실패 상태를 저장하지 못했습니다. eventId={}", event.eventId, markFailedException)
      }
    }
  }

  private fun process(event: OutboxEvent) {
    val eventId = UUID.fromString(event.eventId)

    when (event.eventType) {
      OutboxEventType.PAYMENT_CONFIRMED -> {
        val payload = objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)
        if (reservationRepository.findById(payload.reservationId).orElse(null)?.status != ReservationStatus.SUCCEEDED) {
          return
        }

        val result = redisVenueSeatHoldService.finalizeVenueSeats(
          holdId = payload.holdId,
          scopeId = payload.scopeId,
          performanceId = payload.performanceId,
          venueSeatIds = payload.seatIds,
          eventId = eventId,
        )
        if (result.action == OutboxHoldActionResult.REPLACED) {
          error("예매 확정 대상 Hold의 좌석 소유권이 변경되었습니다.")
        }

        if (reservationRepository.findById(payload.reservationId).orElse(null)?.status != ReservationStatus.SUCCEEDED) {
          return
        }

        performanceVenueSeatStompPublisher.publishReservationConfirmed(
          performanceId = payload.performanceId,
          venueSeatIds = payload.seatIds,
          version = result.version,
          eventId = eventId,
        )
      }

      OutboxEventType.RELEASED_SEATS -> {
        val payload = objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)
        val result = redisVenueSeatHoldService.releaseVenueSeats(
          holdId = payload.holdId,
          scopeId = payload.scopeId,
          performanceId = payload.performanceId,
          venueSeatIds = payload.seatIds,
          eventId = eventId,
        )
        if (
          result.action == OutboxHoldActionResult.APPLIED ||
          result.action == OutboxHoldActionResult.ALREADY_APPLIED
        ) {
          performanceVenueSeatStompPublisher.publishReleasedSeats(
            performanceId = payload.performanceId,
            venueSeatIds = payload.seatIds,
            version = result.version,
            eventId = eventId,
          )
        }
      }

      OutboxEventType.PAYMENT_CANCELLED -> {
        val cancellation = objectMapper.readValue(event.payload, PaymentCancelledSeatEventPayload::class.java)
        val result = redisVenueSeatHoldService.releaseCancelledReservationSeats(
          scopeId = cancellation.scopeId,
          performanceId = cancellation.performanceId,
          venueSeatIds = cancellation.seatIds,
          cancelledAtEpochMillis = cancellation.cancelledAtEpochMillis,
          eventId = eventId,
        )
        val currentlyBookedSeatIds = if (result.releasedVenueSeatIds.isEmpty()) {
          emptySet()
        } else {
          reservationSeatRepository
            .findVenueSeatIdsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
              performanceId = cancellation.performanceId,
              venueSeatIds = result.releasedVenueSeatIds,
              statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
            ).toSet()
        }
        val releasedVenueSeatIds = result.releasedVenueSeatIds.filterNot { it in currentlyBookedSeatIds }
        if (releasedVenueSeatIds.isNotEmpty()) {
          performanceVenueSeatStompPublisher.publishReleasedSeats(
            performanceId = cancellation.performanceId,
            venueSeatIds = releasedVenueSeatIds,
            version = result.version,
            eventId = eventId,
          )
        }
      }
    }
  }
}

package com.example.server.outbox

import com.example.server.config.properties.OutboxDispatcherProperties
import com.example.server.outbox.dto.ReservationSeatEventPayload
import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.types.OutboxEventType
import com.example.server.performance.OutboxHoldActionResult
import com.example.server.performance.PerformanceVenueSeatStompPublisher
import com.example.server.performance.RedisVenueSeatHoldService
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
    val lockToken = requireNotNull(event.lockToken) { "Outbox 이벤트 점유 토큰이 없습니다." }

    runCatching {
      process(event)
    }.onSuccess {
      runCatching {
        outboxEventService.markPublished(
          eventId = event.id,
          lockToken = lockToken,
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
          lockToken = lockToken,
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
    val payload = objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)
    val eventId = UUID.fromString(event.eventId)

    when (event.eventType) {
      OutboxEventType.RESERVATION_CONFIRMED -> {
        val result = redisVenueSeatHoldService.finalizeVenueSeats(
          holdId = payload.holdId,
          groupId = payload.groupId,
          performanceId = payload.performanceId,
          venueSeatIds = payload.seatIds,
        )
        if (result == OutboxHoldActionResult.REPLACED) {
          error("예매 확정 대상 Hold의 좌석 소유권이 변경되었습니다.")
        }

        performanceVenueSeatStompPublisher.publishReservationConfirmed(
          eventId = eventId,
          performanceId = payload.performanceId,
          venueSeatIds = payload.seatIds,
        )
      }

      OutboxEventType.HOLD_RELEASED -> {
        val result = redisVenueSeatHoldService.releaseVenueSeats(
          holdId = payload.holdId,
          groupId = payload.groupId,
          performanceId = payload.performanceId,
          venueSeatIds = payload.seatIds,
          eventId = eventId,
        )
        if (
          result == OutboxHoldActionResult.APPLIED ||
          result == OutboxHoldActionResult.ALREADY_APPLIED
        ) {
          performanceVenueSeatStompPublisher.publishHoldReleased(
            eventId = eventId,
            performanceId = payload.performanceId,
            venueSeatIds = payload.seatIds,
          )
        }
      }
    }
  }
}

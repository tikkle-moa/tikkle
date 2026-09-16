package com.example.server.outbox

import com.example.server.outbox.dto.ReservationSeatEventPayload
import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.repository.OutboxEventRepository
import com.example.server.outbox.types.OutboxEventStatus
import com.example.server.outbox.types.OutboxEventType
import com.example.server.performance.dto.VenueSeatHoldDetail
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime
import java.util.UUID

@Service
class OutboxEventService(private val outboxEventRepository: OutboxEventRepository, private val objectMapper: ObjectMapper) {
  @Transactional(propagation = Propagation.MANDATORY)
  fun recordReservationConfirmed(reservationId: Long, hold: VenueSeatHoldDetail) {
    record(
      reservationId = reservationId,
      hold = hold,
      eventType = OutboxEventType.RESERVATION_CONFIRMED,
      eventKey = "reservation:$reservationId:reservation-confirmed:${hold.holdId}",
    )
  }

  @Transactional(propagation = Propagation.MANDATORY)
  fun recordHoldReleased(reservationId: Long, hold: VenueSeatHoldDetail) {
    record(
      reservationId = reservationId,
      hold = hold,
      eventType = OutboxEventType.HOLD_RELEASED,
      eventKey = "reservation:$reservationId:hold-released:${hold.holdId}",
    )
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  fun claimNext(leaseMillis: Long): OutboxEvent? {
    val now = LocalDateTime.now()
    val event = outboxEventRepository.findNextClaimableForUpdate(
      pendingStatus = OutboxEventStatus.PENDING,
      processingStatus = OutboxEventStatus.PROCESSING,
      now = now,
      leaseExpiredAt = now.minusNanos(leaseMillis * NANOS_PER_MILLISECOND),
      pageable = PageRequest.of(0, 1),
    ).firstOrNull() ?: return null

    event.status = OutboxEventStatus.PROCESSING
    event.attemptCount += 1
    event.processingOwner = UUID.randomUUID().toString()
    event.lockedAt = now
    event.lastError = null
    outboxEventRepository.saveAndFlush(event)
    return event
  }

  @Transactional
  fun markPublished(eventId: Long, processingOwner: String) {
    val now = LocalDateTime.now()
    outboxEventRepository.markPublishedIfOwned(
      eventId = eventId,
      processingStatus = OutboxEventStatus.PROCESSING,
      publishedStatus = OutboxEventStatus.PUBLISHED,
      processingOwner = processingOwner,
      publishedAt = now,
    )
  }

  @Transactional
  fun markFailed(eventId: Long, processingOwner: String, exception: Throwable, maxAttempts: Int, retryDelayMillis: Long) {
    val event = outboxEventRepository.findById(eventId).orElse(null) ?: return
    if (event.status != OutboxEventStatus.PROCESSING || event.processingOwner != processingOwner) return

    val now = LocalDateTime.now()
    val dead = event.attemptCount >= maxAttempts
    val status = if (dead) OutboxEventStatus.DEAD else OutboxEventStatus.PENDING
    val nextAttemptAt = now.plusNanos(retryDelayMillis * NANOS_PER_MILLISECOND)
    val lastError = exception.message?.take(MAX_ERROR_LENGTH) ?: exception::class.simpleName
    outboxEventRepository.markFailedIfOwned(
      eventId = eventId,
      processingStatus = OutboxEventStatus.PROCESSING,
      status = status,
      processingOwner = processingOwner,
      nextAttemptAt = nextAttemptAt,
      lastError = lastError,
    )
  }

  private fun record(reservationId: Long, hold: VenueSeatHoldDetail, eventType: OutboxEventType, eventKey: String) {
    val occurredAt = LocalDateTime.now()
    val payload = ReservationSeatEventPayload(
      reservationId = reservationId,
      holdId = hold.holdId,
      groupId = hold.groupId,
      performanceId = hold.performanceId,
      seatIds = hold.venueSeatIds,
    )

    outboxEventRepository.save(
      OutboxEvent(
        eventKey = eventKey,
        aggregateType = AGGREGATE_TYPE_RESERVATION,
        aggregateId = reservationId,
        performanceId = hold.performanceId,
        eventType = eventType,
        payload = objectMapper.writeValueAsString(payload),
        occurredAt = occurredAt,
        nextAttemptAt = occurredAt,
      ),
    )
  }

  private companion object {
    const val AGGREGATE_TYPE_RESERVATION = "RESERVATION"
    const val MAX_ERROR_LENGTH = 4_000
    const val NANOS_PER_MILLISECOND = 1_000_000L
  }
}

package com.example.server.outbox

import com.example.server.config.properties.OutboxDispatcherProperties
import com.example.server.outbox.dto.ReservationSeatEventPayload
import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.types.OutboxEventType
import com.example.server.performance.OutboxHoldActionResult
import com.example.server.performance.PerformanceVenueSeatStompPublisher
import com.example.server.performance.RedisVenueSeatHoldService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import tools.jackson.databind.ObjectMapper

@ExtendWith(MockitoExtension::class)
class OutboxEventDispatcherTest {
  @Mock
  lateinit var outboxEventService: OutboxEventService

  @Mock
  lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock
  lateinit var performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher

  @Mock
  lateinit var objectMapper: ObjectMapper

  private lateinit var dispatcher: OutboxEventDispatcher

  @BeforeEach
  fun setUp() {
    dispatcher = OutboxEventDispatcher(
      outboxEventService = outboxEventService,
      redisVenueSeatHoldService = redisVenueSeatHoldService,
      performanceVenueSeatStompPublisher = performanceVenueSeatStompPublisher,
      objectMapper = objectMapper,
      properties = PROPERTIES,
    )
  }

  @Test
  fun `예매 확정 이벤트 처리 후 동일 eventId로 발행 완료 처리한다`() {
    val event = event(OutboxEventType.RESERVATION_CONFIRMED)
    val payload = payload()
    given(outboxEventService.claimNext(PROPERTIES.leaseMillis)).willReturn(event, null)
    given(objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)).willReturn(payload)
    given(
      redisVenueSeatHoldService.finalizeVenueSeats(
        holdId = payload.holdId,
        groupId = payload.groupId,
        performanceId = payload.performanceId,
        venueSeatIds = payload.seatIds,
      ),
    ).willReturn(OutboxHoldActionResult.APPLIED)

    dispatcher.dispatch()

    then(performanceVenueSeatStompPublisher).should().publishReservationConfirmed(
      eventId = java.util.UUID.fromString(event.eventId),
      performanceId = payload.performanceId,
      venueSeatIds = payload.seatIds,
    )
    then(outboxEventService).should().markPublished(event.id, event.lockToken!!)
  }

  @Test
  fun `좌석 후처리 실패 시 재시도 상태를 기록한다`() {
    val event = event(OutboxEventType.HOLD_RELEASED)
    val payload = payload()
    val failure = IllegalStateException("redis failed")
    given(outboxEventService.claimNext(PROPERTIES.leaseMillis)).willReturn(event, null)
    given(objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)).willReturn(payload)
    willThrow(failure).given(redisVenueSeatHoldService).releaseVenueSeats(
      holdId = payload.holdId,
      groupId = payload.groupId,
      performanceId = payload.performanceId,
      venueSeatIds = payload.seatIds,
      eventId = java.util.UUID.fromString(event.eventId),
    )

    dispatcher.dispatch()

    then(outboxEventService).should().markFailed(
      eventId = event.id,
      lockToken = event.lockToken!!,
      exception = failure,
      maxAttempts = PROPERTIES.maxAttempts,
      retryDelayMillis = PROPERTIES.retryDelayMillis,
    )
  }

  private fun event(type: OutboxEventType) = OutboxEvent(
    id = 1L,
    eventKey = "reservation:501:${type.name.lowercase()}:hold-1",
    aggregateType = "RESERVATION",
    aggregateId = 501L,
    performanceId = 10L,
    eventType = type,
    payload = PAYLOAD,
  ).also { it.lockToken = LOCK_TOKEN }

  private fun payload() = ReservationSeatEventPayload(
    reservationId = 501L,
    holdId = "hold-1",
    groupId = "1:10",
    performanceId = 10L,
    seatIds = listOf(101L, 102L),
  )

  companion object {
    private const val PAYLOAD = "{}"
    private const val LOCK_TOKEN = "lock-token"
    private val PROPERTIES = OutboxDispatcherProperties(
      batchSize = 1,
      leaseMillis = 30_000,
      maxAttempts = 5,
      retryDelayMillis = 5_000,
    )
  }
}

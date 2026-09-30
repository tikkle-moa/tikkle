package com.example.server.outbox

import com.example.server.config.properties.OutboxDispatcherProperties
import com.example.server.outbox.dto.PaymentCancelledSeatEventPayload
import com.example.server.outbox.dto.ReservationSeatEventPayload
import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.types.OutboxEventType
import com.example.server.outbox.types.OutboxHoldActionResult
import com.example.server.performance.CancelledReservationSeatReleaseResult
import com.example.server.performance.PerformanceVenueSeatStompPublisher
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.performance.VenueSeatHoldActionResult
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.junit.jupiter.MockitoExtension
import tools.jackson.databind.ObjectMapper
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class OutboxEventDispatcherTest {
  @Mock
  lateinit var outboxEventService: OutboxEventService

  @Mock
  lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock
  lateinit var performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher

  @Mock
  lateinit var reservationRepository: ReservationRepository

  @Mock
  lateinit var reservationSeatRepository: ReservationSeatRepository

  @Mock
  lateinit var objectMapper: ObjectMapper

  private lateinit var dispatcher: OutboxEventDispatcher

  @BeforeEach
  fun setUp() {
    dispatcher = OutboxEventDispatcher(
      outboxEventService = outboxEventService,
      redisVenueSeatHoldService = redisVenueSeatHoldService,
      performanceVenueSeatStompPublisher = performanceVenueSeatStompPublisher,
      reservationRepository = reservationRepository,
      reservationSeatRepository = reservationSeatRepository,
      objectMapper = objectMapper,
      properties = PROPERTIES,
    )
  }

  @Test
  fun `예매 확정 이벤트 처리 후 동일 eventId로 발행 완료 처리한다`() {
    val event = event(OutboxEventType.PAYMENT_CONFIRMED)
    val payload = payload()
    givenReservationStatus(payload.reservationId, ReservationStatus.SUCCEEDED)
    given(outboxEventService.claimNext(PROPERTIES.leaseMillis)).willReturn(event, null)
    given(objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)).willReturn(payload)
    given(
      redisVenueSeatHoldService.finalizeVenueSeats(
        holdId = payload.holdId,
        groupId = payload.groupId,
        performanceId = payload.performanceId,
        venueSeatIds = payload.seatIds,
        eventId = java.util.UUID.fromString(event.eventId),
      ),
    ).willReturn(VenueSeatHoldActionResult(OutboxHoldActionResult.APPLIED, version = 9L))

    dispatcher.dispatch()

    then(performanceVenueSeatStompPublisher).should().publishReservationConfirmed(
      eventId = java.util.UUID.fromString(event.eventId),
      performanceId = payload.performanceId,
      venueSeatIds = payload.seatIds,
      version = 9L,
    )
    then(outboxEventService).should().markPublished(event.id, event.processingOwner!!)
  }

  @Test
  fun `취소 이벤트는 Toss 환불 뒤 해제된 좌석을 발행한다`() {
    val event = event(OutboxEventType.PAYMENT_CANCELLED)
    val payload = PaymentCancelledSeatEventPayload(
      reservationId = 501L,
      groupId = "1:10",
      performanceId = 10L,
      seatIds = listOf(101L, 102L),
      cancelledAtEpochMillis = 1_798_700_000_000,
    )
    given(outboxEventService.claimNext(PROPERTIES.leaseMillis)).willReturn(event, null)
    given(objectMapper.readValue(event.payload, PaymentCancelledSeatEventPayload::class.java))
      .willReturn(payload)
    given(
      redisVenueSeatHoldService.releaseCancelledReservationSeats(
        groupId = payload.groupId,
        performanceId = payload.performanceId,
        venueSeatIds = payload.seatIds,
        cancelledAtEpochMillis = payload.cancelledAtEpochMillis,
        eventId = java.util.UUID.fromString(event.eventId),
      ),
    ).willReturn(
      CancelledReservationSeatReleaseResult(
        OutboxHoldActionResult.APPLIED,
        version = 10L,
        releasedVenueSeatIds = payload.seatIds,
      ),
    )
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        payload.performanceId,
        payload.seatIds,
        ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(emptyList())

    dispatcher.dispatch()

    then(performanceVenueSeatStompPublisher).should().publishReleasedSeats(
      eventId = java.util.UUID.fromString(event.eventId),
      performanceId = payload.performanceId,
      venueSeatIds = payload.seatIds,
      version = 10L,
    )
    then(outboxEventService).should().markPublished(event.id, event.processingOwner!!)
  }

  @Test
  fun `이미 다시 예매된 좌석은 취소 이벤트에서 빈 좌석으로 발행하지 않는다`() {
    val event = event(OutboxEventType.PAYMENT_CANCELLED)
    val payload = PaymentCancelledSeatEventPayload(
      reservationId = 501L,
      groupId = "1:10",
      performanceId = 10L,
      seatIds = listOf(101L, 102L),
      cancelledAtEpochMillis = 1_798_700_000_000,
    )
    given(outboxEventService.claimNext(PROPERTIES.leaseMillis)).willReturn(event, null)
    given(objectMapper.readValue(event.payload, PaymentCancelledSeatEventPayload::class.java)).willReturn(payload)
    given(
      redisVenueSeatHoldService.releaseCancelledReservationSeats(
        groupId = payload.groupId,
        performanceId = payload.performanceId,
        venueSeatIds = payload.seatIds,
        cancelledAtEpochMillis = payload.cancelledAtEpochMillis,
        eventId = java.util.UUID.fromString(event.eventId),
      ),
    ).willReturn(
      CancelledReservationSeatReleaseResult(
        OutboxHoldActionResult.APPLIED,
        version = 10L,
        releasedVenueSeatIds = payload.seatIds,
      ),
    )
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        payload.performanceId,
        payload.seatIds,
        ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(listOf(102L))

    dispatcher.dispatch()

    then(performanceVenueSeatStompPublisher).should().publishReleasedSeats(
      eventId = java.util.UUID.fromString(event.eventId),
      performanceId = payload.performanceId,
      venueSeatIds = listOf(101L),
      version = 10L,
    )
  }

  @Test
  fun `이미 취소된 예매의 확정 outbox는 오래된 좌석 이벤트를 발행하지 않는다`() {
    val event = event(OutboxEventType.PAYMENT_CONFIRMED)
    val payload = payload()
    givenReservationStatus(payload.reservationId, ReservationStatus.REFUNDED)
    given(outboxEventService.claimNext(PROPERTIES.leaseMillis)).willReturn(event, null)
    given(objectMapper.readValue(event.payload, ReservationSeatEventPayload::class.java)).willReturn(payload)

    dispatcher.dispatch()

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
    then(outboxEventService).should().markPublished(event.id, event.processingOwner!!)
  }

  @Test
  fun `좌석 후처리 실패 시 재시도 상태를 기록한다`() {
    val event = event(OutboxEventType.RELEASED_SEATS)
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
      processingOwner = event.processingOwner!!,
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
  ).also { it.processingOwner = PROCESSING_OWNER }

  private fun payload() = ReservationSeatEventPayload(
    reservationId = 501L,
    holdId = "hold-1",
    groupId = "1:10",
    performanceId = 10L,
    seatIds = listOf(101L, 102L),
  )

  private fun givenReservationStatus(reservationId: Long, status: ReservationStatus) {
    val reservation = mock(Reservation::class.java)
    given(reservation.status).willReturn(status)
    given(reservationRepository.findById(reservationId)).willReturn(Optional.of(reservation))
  }

  companion object {
    private const val PAYLOAD = "{}"
    private const val PROCESSING_OWNER = "processing-owner"
    private val PROPERTIES = OutboxDispatcherProperties(
      batchSize = 1,
      leaseMillis = 30_000,
      maxAttempts = 5,
      retryDelayMillis = 5_000,
    )
  }
}

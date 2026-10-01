package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.OutboxEventService
import com.example.server.performance.entity.Performance
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.payment.dto.ReservationCancellationAttempt
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.entity.Venue
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class ReservationCancellationTransactionServiceTest {
  @Mock lateinit var reservationRepository: ReservationRepository

  @Mock lateinit var reservationSeatRepository: ReservationSeatRepository

  @Mock lateinit var outboxEventService: OutboxEventService

  @InjectMocks lateinit var service: ReservationCancellationTransactionService

  @Test
  fun `공연 시작 전 본인 예매를 취소 대기 상태로 전환한다`() {
    val reservation = reservation()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val attempt = service.begin(USER_ID, RESERVATION_ID)

    assertThat(attempt).isEqualTo(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
    assertThat(reservation.status).isEqualTo(ReservationStatus.CANCELLATION_PENDING)
  }

  @Test
  fun `없는 예매의 취소 시작은 NOT_FOUND를 반환한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)

    val exception = assertThrows<CustomException> { service.begin(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `이미 환불된 예매는 취소 시도를 만들지 않는다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(status = ReservationStatus.REFUNDED))

    assertThat(service.begin(USER_ID, RESERVATION_ID)).isNull()
  }

  @Test
  fun `취소 대기 예매 재요청은 같은 결제 시도를 반환한다`() {
    val reservation = reservation(status = ReservationStatus.CANCELLATION_PENDING)
    val expected = ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(reservationRepository.findById(RESERVATION_ID)).willReturn(Optional.of(reservation))

    assertThat(service.begin(USER_ID, RESERVATION_ID)).isEqualTo(expected)
    assertThat(service.findPending(RESERVATION_ID)).isEqualTo(expected)
  }

  @Test
  fun `환불 계좌 입력 필요 상태의 재요청은 취소 대기로 되돌린다`() {
    val reservation = reservation(status = ReservationStatus.REFUND_ACCOUNT_REQUIRED)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val attempt = service.begin(USER_ID, RESERVATION_ID)

    assertThat(attempt).isEqualTo(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
    assertThat(reservation.status).isEqualTo(ReservationStatus.CANCELLATION_PENDING)
  }

  @Test
  fun `결제 대기 예매는 취소를 시작할 수 없다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(status = ReservationStatus.PAYMENT_PENDING))

    val exception = assertThrows<CustomException> { service.begin(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `결제 키가 없는 예매는 취소를 시작할 수 없다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(paymentKey = null))

    val exception = assertThrows<CustomException> { service.begin(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `공연 시작 시각 이후에는 취소를 거부한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(performanceStartsAt = LocalDateTime.now().minusSeconds(1)))

    val exception = assertThrows<CustomException> { service.begin(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `다른 사용자의 예매 취소는 거부한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(booker = User(OTHER_USER_ID, "other@example.com", "다른 사용자")))

    val exception = assertThrows<CustomException> { service.begin(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
  }

  @Test
  fun `환불 완료 후 좌석 이력을 유지하고 해제 이벤트를 기록한다`() {
    val reservation = reservation(status = ReservationStatus.CANCELLATION_PENDING)
    val attempt = ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(reservationSeatRepository.findVenueSeatIdsByReservationId(RESERVATION_ID)).willReturn(listOf(101L, 102L))

    val result = service.complete(attempt)

    assertThat(result.reservationId).isEqualTo(RESERVATION_ID)
    assertThat(result.status).isEqualTo(ReservationStatus.REFUNDED)
    then(outboxEventService).should().recordPaymentCancelled(
      RESERVATION_ID,
      GROUP_ID,
      PERFORMANCE_ID,
      listOf(101L, 102L),
    )
  }

  @Test
  fun `취소 대기에서 환불 계좌 입력 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.CANCELLATION_PENDING)
    val attempt = ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val result = service.requireRefundAccount(attempt)

    assertThat(result.status).isEqualTo(ReservationStatus.REFUND_ACCOUNT_REQUIRED)
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_ACCOUNT_REQUIRED)
  }

  @Test
  fun `이미 환불 완료 상태면 취소 완료 처리를 반복하지 않는다`() {
    val reservation = reservation(status = ReservationStatus.REFUNDED)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val result = service.complete(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))

    assertThat(result.status).isEqualTo(ReservationStatus.REFUNDED)
    then(reservationSeatRepository).shouldHaveNoInteractions()
    then(outboxEventService).shouldHaveNoInteractions()
  }

  @Test
  fun `없는 예매의 취소 완료는 NOT_FOUND를 반환한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.complete(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `취소 대기 상태가 아니면 취소 완료를 반영하지 않는다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation())

    val exception = assertThrows<CustomException> {
      service.complete(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(reservationSeatRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `좌석이 없는 예매 취소는 Outbox 이벤트를 기록하지 않는다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(status = ReservationStatus.CANCELLATION_PENDING))
    given(reservationSeatRepository.findVenueSeatIdsByReservationId(RESERVATION_ID)).willReturn(emptyList())

    val result = service.complete(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))

    assertThat(result.status).isEqualTo(ReservationStatus.REFUNDED)
    then(outboxEventService).shouldHaveNoInteractions()
  }

  @Test
  fun `없는 예매나 취소 대기 상태가 아닌 예매는 대사 대상으로 조회되지 않는다`() {
    given(reservationRepository.findById(RESERVATION_ID))
      .willReturn(Optional.empty(), Optional.of(reservation()))

    assertThat(service.findPending(RESERVATION_ID)).isNull()
    assertThat(service.findPending(RESERVATION_ID)).isNull()
  }

  @Test
  fun `결제 키가 없는 취소 대기 예매는 대사 대상으로 조회되지 않는다`() {
    given(reservationRepository.findById(RESERVATION_ID))
      .willReturn(Optional.of(reservation(status = ReservationStatus.CANCELLATION_PENDING, paymentKey = null)))

    assertThat(service.findPending(RESERVATION_ID)).isNull()
  }

  @Test
  fun `다른 결제 시도 키로 취소 완료를 반영하지 않는다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
      .willReturn(reservation(status = ReservationStatus.CANCELLATION_PENDING))

    val exception = assertThrows<CustomException> {
      service.complete(ReservationCancellationAttempt(RESERVATION_ID, USER_ID, "other-payment", ORDER_ID, AMOUNT))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(reservationSeatRepository).shouldHaveNoInteractions()
  }

  private fun reservation(
    status: ReservationStatus = ReservationStatus.SUCCEEDED,
    booker: User = User(USER_ID, "user@example.com", "사용자"),
    performanceStartsAt: LocalDateTime = LocalDateTime.now().plusDays(1),
    paymentKey: String? = PAYMENT_KEY,
  ) = Reservation(
    id = RESERVATION_ID,
    performance = Performance(
      PERFORMANCE_ID,
      Concert(1L, venue(), "공연", ConcertGenre.BALLAD),
      "1회차",
      performanceStartsAt,
    ),
    booker = booker,
    groupId = GROUP_ID,
    orderId = ORDER_ID,
    orderName = "공연 1회차 2석",
    amount = AMOUNT,
    status = status,
    paymentExpiresAt = LocalDateTime.now().plusMinutes(10),
    paymentKey = paymentKey,
  )

  private fun venue() = Venue(
    id = VENUE_ID,
    name = "공연장",
    address = "서울",
    width = BigDecimal("100"),
    height = BigDecimal("100"),
    stagePositionX = BigDecimal("20"),
    stagePositionY = BigDecimal("5"),
    stageWidth = BigDecimal("40"),
    stageHeight = BigDecimal("10"),
  )

  private companion object {
    const val USER_ID = 1L
    const val OTHER_USER_ID = 2L
    const val PERFORMANCE_ID = 10L
    const val VENUE_ID = 20L
    const val RESERVATION_ID = 501L
    const val PAYMENT_KEY = "payment-key"
    const val ORDER_ID = "order-id"
    const val GROUP_ID = "1:10"
    const val AMOUNT = 66_000
  }
}

package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.OutboxEventService
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.performance.dto.ActiveHoldData
import com.example.server.performance.dto.HoldVenueSeatEntry
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.entity.Performance
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.payment.dto.ActiveHoldsSnapshot
import com.example.server.reservation.payment.dto.PaymentConfirmationAttempt
import com.example.server.reservation.payment.dto.PaymentConfirmationCompletion
import com.example.server.reservation.payment.dto.PaymentConfirmationStart
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.support.any
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class ReservationPaymentConfirmationServiceTest {
  @Mock lateinit var reservationRepository: ReservationRepository

  @Mock lateinit var reservationSeatRepository: ReservationSeatRepository

  @Mock lateinit var venueSeatRepository: VenueSeatRepository

  @Mock lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock lateinit var outboxEventService: OutboxEventService

  @InjectMocks lateinit var service: ReservationPaymentConfirmationService

  @Test
  fun `결제 시작 시 모든 활성 Hold 좌석과 금액을 검증하고 승인 시도로 전환한다`() {
    val reservation = reservation()
    val active = activeHoldData()
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L, 102L))).willReturn(false)

    val result = service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)

    assertThat(result).isEqualTo(PaymentConfirmationStart.Ready(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)))
    assertThat(reservation.status).isEqualTo(ReservationStatus.PAYMENT_CONFIRMING)
    assertThat(reservation.paymentAttemptKey).isEqualTo(PAYMENT_KEY)
  }

  @Test
  fun `결제 금액이 좌석 합계와 다르면 시작을 거부한다`() {
    val reservation = reservation(amount = AMOUNT + 1)
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation)

    val exception = assertThrows<CustomException> { service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `결제 대상 Hold가 만료되었으면 시작을 충돌로 반환한다`() {
    val reservation = reservation()
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willThrow(CustomException(ErrorCode.NOT_FOUND, "점유된 좌석이 존재하지 않습니다."))

    val exception = assertThrows<CustomException> { service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
  }

  @Test
  fun `이미 성공한 동일 결제는 기존 성공 결과를 반환한다`() {
    val reservation = reservation(status = ReservationStatus.SUCCEEDED).also { it.paymentKey = PAYMENT_KEY }
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation)

    val result = service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)

    assertThat(result).isInstanceOf(PaymentConfirmationStart.AlreadySucceeded::class.java)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `결제 대상 예매가 없으면 NOT_FOUND를 반환한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `예매 소유자가 아니면 FORBIDDEN을 반환한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation(booker = user(OTHER_USER_ID)))

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @ParameterizedTest
  @EnumSource(
    value = ReservationStatus::class,
    names = ["PAYMENT_CONFIRMING", "REFUND_REQUIRED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"],
  )
  fun `종료 또는 진행 중인 예매는 결제 시작을 거부한다`(status: ReservationStatus) {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation(status = status))

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `이미 성공한 예매에 다른 결제 키가 오면 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
      .willReturn(reservation(status = ReservationStatus.SUCCEEDED).also { it.paymentKey = PAYMENT_KEY })

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, "another-key", ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `이미 성공한 예매에 다른 금액이 오면 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
      .willReturn(reservation(status = ReservationStatus.SUCCEEDED).also { it.paymentKey = PAYMENT_KEY })

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT + 1)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `결제 기한이 지나면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
      .willReturn(reservation(paymentExpiresAt = LocalDateTime.now().minusSeconds(1)))

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
  }

  @Test
  fun `Hold 조회 중 NOT_FOUND가 아닌 예외는 그대로 전파한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    val exception = CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "redis failure")
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willThrow(exception)

    val actual = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(actual).isSameAs(exception)
  }

  @Test
  fun `Hold 공연 회차가 예매와 다르면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willReturn(activeHoldData(performanceId = OTHER_PERFORMANCE_ID))

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(venueSeatRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `Hold detail의 그룹이 다르면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    val invalid = activeHoldData(holds = listOf(hold("hold-1", listOf(101L, 102L)).copy(groupId = "other-group")))
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(invalid)

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `Hold detail의 공연 회차가 다르면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    val invalid = activeHoldData(holds = listOf(hold("hold-1", listOf(101L, 102L)).copy(performanceId = OTHER_PERFORMANCE_ID)))
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(invalid)

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `중복된 Hold 좌석이 있으면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    val detail = hold("hold-1", listOf(101L, 102L))
    val duplicate = activeHoldData(holds = listOf(detail), entries = listOf(101L, 101L))
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(duplicate)

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `공연장 좌석이 누락되면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000)))

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `좌석 가격 합계가 결제 금액과 다르면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 1)))

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `이미 예매된 좌석이 있으면 결제 시작을 거부한다`() {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID)).willReturn(reservation())
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L, 102L)))
      .willReturn(true)

    val exception = assertThrows<CustomException> {
      service.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `승인 완료 시 예매 좌석을 저장하고 모든 Hold의 스냅샷을 반환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L, 102L))).willReturn(false)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isInstanceOf(PaymentConfirmationCompletion.Succeeded::class.java)
    assertThat((result as PaymentConfirmationCompletion.Succeeded).holds)
      .isEqualTo(ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, listOf(101L, 102L), active.holdDetails))
    assertThat(reservation.status).isEqualTo(ReservationStatus.SUCCEEDED)
    assertThat(reservation.paymentKey).isEqualTo(PAYMENT_KEY)
    then(reservationSeatRepository).should().saveAll(any<Iterable<ReservationSeat>>())
    then(outboxEventService).should().recordReservationConfirmed(RESERVATION_ID, active.holdDetails.single())
  }

  @Test
  fun `승인 완료 시 Hold가 만료되었으면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(
      status = ReservationStatus.PAYMENT_CONFIRMING,
      paymentExpiresAt = LocalDateTime.now().minusSeconds(1),
    ).also { it.paymentAttemptKey = PAYMENT_KEY }
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(
      result,
    ).isEqualTo(PaymentConfirmationCompletion.RefundRequired(ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, listOf(101L, 102L), active.holdDetails)))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `서로 다른 그룹의 Hold가 섞여 있으면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    val invalid = activeHoldData().copy(holdDetails = listOf(hold("hold-1", listOf(101L, 102L)).copy(groupId = "other-group")))
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(invalid)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(PaymentConfirmationCompletion.RefundRequired(null))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `환불 필요 상태를 확정하면 REFUNDED와 Hold 스냅샷을 반환한다`() {
    val reservation = reservation(status = ReservationStatus.REFUND_REQUIRED).also { it.paymentAttemptKey = PAYMENT_KEY }
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.completeRefund(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, listOf(101L, 102L), active.holdDetails))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUNDED)
    then(outboxEventService).should().recordReleasedSeats(RESERVATION_ID, active.holdDetails.single())
  }

  @Test
  fun `승인 중 결제 실패를 기록하고 Hold 스냅샷을 반환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, listOf(101L, 102L), active.holdDetails))
    assertThat(reservation.status).isEqualTo(ReservationStatus.FAILED)
    then(outboxEventService).should().recordReleasedSeats(RESERVATION_ID, active.holdDetails.single())
  }

  @Test
  fun `승인 중 결제 실패 시 활성 Hold가 없으면 해제 이벤트를 저장하지 않는다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willThrow(CustomException(ErrorCode.NOT_FOUND, "점유된 좌석이 없습니다."))

    val result = service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isNull()
    assertThat(reservation.status).isEqualTo(ReservationStatus.FAILED)
    then(outboxEventService).shouldHaveNoInteractions()
  }

  @Test
  fun `승인 중 결제 실패 시 Hold 상세 목록이 비어 있으면 해제 이벤트를 저장하지 않는다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    val active = ActiveHoldData(
      groupId = GROUP_ID,
      performanceId = PERFORMANCE_ID,
      holdGroupKey = "hold:group:$GROUP_ID",
      storedHoldDetailJsons = emptyList(),
      holdDetailKeys = emptyList(),
      holdDetails = emptyList(),
      holdVenueSeatEntries = emptyList(),
    )
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, emptyList()))
    assertThat(reservation.status).isEqualTo(ReservationStatus.FAILED)
    then(outboxEventService).shouldHaveNoInteractions()
  }

  @Test
  fun `승인 완료 대상 예매가 없으면 NOT_FOUND를 반환한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `이미 성공한 예매를 완료하면 기존 결과를 반환한다`() {
    val reservation = reservation(status = ReservationStatus.SUCCEEDED).also { it.paymentKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isInstanceOf(PaymentConfirmationCompletion.Succeeded::class.java)
    assertThat((result as PaymentConfirmationCompletion.Succeeded).holds).isNull()
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `환불 필요 예매를 완료하면 기존 환불 결과를 반환한다`() {
    val reservation = reservation(status = ReservationStatus.REFUND_REQUIRED)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(PaymentConfirmationCompletion.RefundRequired(null))
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `승인 중이 아닌 예매를 완료하면 충돌을 반환한다`() {
    val reservation = reservation(status = ReservationStatus.CANCELLED)
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val exception = assertThrows<CustomException> {
      service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `승인 시도 키가 다르면 완료를 거부한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = "other-key" }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    val exception = assertThrows<IllegalStateException> {
      service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))
    }

    assertThat(exception).hasMessage("결제 승인 시도 키가 일치하지 않습니다.")
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `활성 Hold가 없으면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willThrow(
      CustomException(ErrorCode.NOT_FOUND, "expired"),
    )

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(PaymentConfirmationCompletion.RefundRequired(null))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `활성 Hold의 공연 회차가 다르면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willReturn(activeHoldData(performanceId = OTHER_PERFORMANCE_ID))

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(PaymentConfirmationCompletion.RefundRequired(null))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `Hold 좌석이 누락되면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000)))

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isInstanceOf(PaymentConfirmationCompletion.RefundRequired::class.java)
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `승인 완료 좌석 가격이 다르면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 1)))

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isInstanceOf(PaymentConfirmationCompletion.RefundRequired::class.java)
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `이미 예매된 좌석이 있으면 환불 필요 상태로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L, 102L)))
      .willReturn(true)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isInstanceOf(PaymentConfirmationCompletion.RefundRequired::class.java)
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `환불 필요 예매에 활성 Hold가 없어도 REFUNDED로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.REFUND_REQUIRED).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willThrow(
      CustomException(ErrorCode.NOT_FOUND, "expired"),
    )

    val result = service.completeRefund(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isNull()
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUNDED)
  }

  @Test
  fun `예매가 없거나 환불 대상이 아니면 환불 완료를 건너뛴다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)
    assertThat(service.completeRefund(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isNull()

    val confirming = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(confirming)
    assertThat(service.completeRefund(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isNull()

    val wrongKey = reservation(status = ReservationStatus.REFUND_REQUIRED).also { it.paymentAttemptKey = "other-key" }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(wrongKey)
    assertThat(service.completeRefund(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isNull()
  }

  @ParameterizedTest
  @EnumSource(
    value = ReservationStatus::class,
    names = ["PAYMENT_PENDING", "PAYMENT_CONFIRMING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"],
  )
  fun `대사 대상이 아닌 상태는 null을 반환한다`(status: ReservationStatus) {
    given(reservationRepository.findById(RESERVATION_ID)).willReturn(Optional.of(reservation(status = status)))

    assertThat(service.findReconciliationTarget(RESERVATION_ID)).isNull()
  }

  @Test
  fun `대사 예매가 없거나 승인 키가 없으면 null을 반환한다`() {
    given(reservationRepository.findById(RESERVATION_ID)).willReturn(Optional.empty())
    assertThat(service.findReconciliationTarget(RESERVATION_ID)).isNull()

    given(reservationRepository.findById(RESERVATION_ID)).willReturn(
      Optional.of(reservation(status = ReservationStatus.PAYMENT_CONFIRMING)),
    )
    assertThat(service.findReconciliationTarget(RESERVATION_ID)).isNull()

    val confirming = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findById(RESERVATION_ID)).willReturn(Optional.of(confirming))
    assertThat(service.findReconciliationTarget(RESERVATION_ID)).isEqualTo(
      com.example.server.reservation.payment.dto.PaymentReconciliationTarget(
        RESERVATION_ID,
        ReservationStatus.PAYMENT_CONFIRMING,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      ),
    )

    val refundRequired = reservation(status = ReservationStatus.REFUND_REQUIRED).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findById(RESERVATION_ID)).willReturn(Optional.of(refundRequired))
    assertThat(service.findReconciliationTarget(RESERVATION_ID)?.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `승인 중 예매의 결제 실패 처리를 건너뛴다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)
    assertThat(service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isNull()

    val wrongStatus = reservation(status = ReservationStatus.REFUND_REQUIRED).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(wrongStatus)
    assertThat(service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isNull()

    val wrongKey = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = "other-key" }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(wrongKey)
    assertThat(service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isNull()
  }

  @Test
  fun `환불 필요 전환은 예매와 승인 키 상태를 검증한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)
    assertThat(service.markRefundRequired(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isFalse()

    val wrongKey = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = "other-key" }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(wrongKey)
    assertThat(service.markRefundRequired(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isFalse()

    val alreadyRequired = reservation(status = ReservationStatus.REFUND_REQUIRED).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(alreadyRequired)
    assertThat(service.markRefundRequired(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isTrue()

    val failed = reservation(status = ReservationStatus.FAILED).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(failed)
    assertThat(service.markRefundRequired(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isFalse()

    val confirming = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(confirming)
    assertThat(service.markRefundRequired(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))).isTrue()
    assertThat(confirming.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `승인 중 Hold 조회의 내부 오류는 그대로 전파한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    val exception = CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "hold mismatch")
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willThrow(exception)

    val actual = assertThrows<CustomException> {
      service.markPaymentFailed(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))
    }

    assertThat(actual).isSameAs(exception)
  }

  @Test
  fun `Hold snapshot의 중복 좌석은 승인 완료를 환불로 전환한다`() {
    val reservation = reservation(status = ReservationStatus.PAYMENT_CONFIRMING).also { it.paymentAttemptKey = PAYMENT_KEY }
    val active = activeHoldData(entries = listOf(101L, 101L))
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(PaymentConfirmationCompletion.RefundRequired(null))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  @Test
  fun `Hold detail가 기대 공연 회차와 다르면 승인 완료를 환불로 전환한다`() {
    val reservation = reservation(
      status = ReservationStatus.PAYMENT_CONFIRMING,
      performance = performance(OTHER_PERFORMANCE_ID),
    ).also { it.paymentAttemptKey = PAYMENT_KEY }
    val invalid = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(invalid)

    val result = service.complete(PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY))

    assertThat(result).isEqualTo(PaymentConfirmationCompletion.RefundRequired(null))
    assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
  }

  private fun activeHoldData(
    holds: List<VenueSeatHoldDetail> = listOf(hold("hold-1", listOf(101L, 102L))),
    groupId: String = GROUP_ID,
    performanceId: Long = PERFORMANCE_ID,
    entries: List<Long>? = null,
  ): ActiveHoldData {
    val detail = holds.first()
    val seatEntries = entries ?: holds.flatMap { it.venueSeatIds }
    return ActiveHoldData(
      groupId = groupId,
      performanceId = performanceId,
      holdGroupKey = "hold:group:$groupId",
      storedHoldDetailJsons = holds.map { "{}" },
      holdDetailKeys = holds.map { "hold:detail:${it.holdId}" },
      holdDetails = holds,
      holdVenueSeatEntries = seatEntries.map { HoldVenueSeatEntry("hold:venue-seat:$performanceId:$it", detail.holdId, it) },
    )
  }

  private fun hold(id: String, seats: List<Long>, groupId: String = GROUP_ID, performanceId: Long = PERFORMANCE_ID) =
    VenueSeatHoldDetail(id, groupId, performanceId, seats, LocalDateTime.now().plusMinutes(5))
  private fun reservation(
    status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,
    amount: Int = AMOUNT,
    paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5),
    booker: User = user(),
    performance: Performance = performance(),
  ) = Reservation(
    id = RESERVATION_ID,
    performance = performance,
    booker = booker,
    groupId = GROUP_ID,
    orderId = ORDER_ID,
    orderName = "아이유 콘서트 1회차 2석",
    amount = amount,
    status = status,
    paymentExpiresAt = paymentExpiresAt,
  )

  private fun performance(id: Long = PERFORMANCE_ID) =
    Performance(id, Concert(1L, venue(), "아이유 콘서트", ConcertGenre.BALLAD), "1회차", LocalDateTime.of(2027, 1, 20, 19, 0))
  private fun venue() = Venue(
    VENUE_ID, "공연장", "서울",
    width = BigDecimal(
      "100",
    ),
    height = BigDecimal(
      "100",
    ),
    stagePositionX = BigDecimal("20"), stagePositionY = BigDecimal("5"), stageWidth = BigDecimal("40"), stageHeight = BigDecimal("10"),
  )
  private fun venueSeat(id: Long, price: Int) = VenueSeat(id, venue(), "A", id.toInt(), "A-$id", price, BigDecimal("10"), BigDecimal("10"))
  private fun user(id: Long = USER_ID) = User(id, "user-$id@example.com", "사용자$id")

  companion object {
    private const val USER_ID = 1L
    private const val OTHER_USER_ID = 2L
    private const val PERFORMANCE_ID = 10L
    private const val OTHER_PERFORMANCE_ID = 11L
    private const val VENUE_ID = 20L
    private const val GROUP_ID = "1:10"
    private const val RESERVATION_ID = 501L
    private const val PAYMENT_KEY = "payment-key"
    private const val ORDER_ID = "order-id"
    private const val AMOUNT = 132_000
  }
}

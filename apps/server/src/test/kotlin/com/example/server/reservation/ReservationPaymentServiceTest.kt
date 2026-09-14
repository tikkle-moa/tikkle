package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceVenueSeatStompPublisher
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.ActiveHoldsSnapshot
import com.example.server.reservation.payment.dto.ConfirmPaymentResult
import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.dto.PaymentConfirmationAttempt
import com.example.server.reservation.payment.dto.PaymentConfirmationCompletion
import com.example.server.reservation.payment.dto.PaymentConfirmationStart
import com.example.server.reservation.payment.dto.PaymentReconciliationTarget
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.types.ReservationStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.transaction.support.TransactionSynchronizationManager

@ExtendWith(MockitoExtension::class)
class ReservationPaymentServiceTest {
  @Mock lateinit var paymentConfirmationService: ReservationPaymentConfirmationService

  @Mock lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock lateinit var paymentGateway: PaymentGateway

  @Mock lateinit var performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher

  @InjectMocks lateinit var service: ReservationPaymentService

  @AfterEach
  fun clearTransactionSynchronization() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization()
    }
  }

  @Test
  fun `결제 승인 성공 시 Hold를 최종 처리하고 좌석 확정 이벤트를 발행한다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
      .willReturn(PaymentConfirmationStart.Ready(attempt))
    given(paymentGateway.confirm(PAYMENT_KEY, ORDER_ID, AMOUNT))
      .willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.DONE))
    given(paymentConfirmationService.complete(attempt))
      .willReturn(PaymentConfirmationCompletion.Succeeded(ConfirmPaymentResult(RESERVATION_ID, ReservationStatus.SUCCEEDED), holds))

    val result = service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)

    assertThat(result).isEqualTo(ConfirmPaymentResult(RESERVATION_ID, ReservationStatus.SUCCEEDED))
    then(redisVenueSeatHoldService).should().finalizeForPayment(GROUP_ID)
    then(performanceVenueSeatStompPublisher).should().publishReservationConfirmed(PERFORMANCE_ID, VENUE_SEAT_IDS)
  }

  @Test
  fun `이미 성공한 결제는 외부 결제 승인 없이 기존 결과를 반환한다`() {
    val result = ConfirmPaymentResult(RESERVATION_ID, ReservationStatus.SUCCEEDED)
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
      .willReturn(PaymentConfirmationStart.AlreadySucceeded(result))

    assertThat(service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).isEqualTo(result)
    then(paymentGateway).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제가 DONE이 아니면 승인 대기 충돌을 반환한다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).willReturn(PaymentConfirmationStart.Ready(attempt))
    given(paymentGateway.confirm(PAYMENT_KEY, ORDER_ID, AMOUNT)).willReturn(
      ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.IN_PROGRESS),
    )

    val exception = assertThrows<CustomException> { service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(paymentConfirmationService).should().begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `승인 후 확정 검증이 실패하면 결제를 취소하고 Hold를 해제한다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).willReturn(PaymentConfirmationStart.Ready(attempt))
    given(
      paymentGateway.confirm(PAYMENT_KEY, ORDER_ID, AMOUNT),
    ).willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.DONE))
    given(paymentConfirmationService.complete(attempt)).willReturn(PaymentConfirmationCompletion.RefundRequired(holds))
    given(paymentConfirmationService.completeRefund(attempt)).willReturn(holds)
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(VENUE_SEAT_IDS)

    val exception = assertThrows<CustomException> { service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(paymentGateway).should().cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
    then(paymentConfirmationService).should().completeRefund(attempt)
    then(redisVenueSeatHoldService).should().releaseAllVenueSeats(GROUP_ID)
    then(performanceVenueSeatStompPublisher).should().publishHoldReleased(PERFORMANCE_ID, VENUE_SEAT_IDS)
  }

  @Test
  fun `확정 처리 중 예외가 나면 환불 상태 전환 후 원래 예외를 다시 던진다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    val failure = IllegalStateException("database failure")
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).willReturn(PaymentConfirmationStart.Ready(attempt))
    given(
      paymentGateway.confirm(PAYMENT_KEY, ORDER_ID, AMOUNT),
    ).willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.DONE))
    given(paymentConfirmationService.complete(attempt)).willThrow(failure)
    given(paymentConfirmationService.markRefundRequired(attempt)).willReturn(true)
    given(paymentConfirmationService.completeRefund(attempt)).willReturn(holds)
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(VENUE_SEAT_IDS)

    val exception = assertThrows<IllegalStateException> { service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT) }

    assertThat(exception).isSameAs(failure)
    then(paymentGateway).should().cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
  }

  @Test
  fun `대상 결제가 없으면 승인 중 예매를 실패 처리하고 Hold를 해제한다`() {
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(
      com.example.server.reservation.payment.dto.PaymentReconciliationTarget(
        RESERVATION_ID,
        ReservationStatus.PAYMENT_CONFIRMING,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      ),
    )
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
    given(paymentConfirmationService.markPaymentFailed(attempt)).willReturn(holds)
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(VENUE_SEAT_IDS)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).should().markPaymentFailed(attempt)
    then(redisVenueSeatHoldService).should().releaseAllVenueSeats(GROUP_ID)
    then(performanceVenueSeatStompPublisher).should().publishHoldReleased(PERFORMANCE_ID, VENUE_SEAT_IDS)
  }

  @Test
  fun `대사 중 DONE 결제는 정상 확정 흐름을 재사용한다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(
      com.example.server.reservation.payment.dto.PaymentReconciliationTarget(
        RESERVATION_ID,
        ReservationStatus.PAYMENT_CONFIRMING,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      ),
    )
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.DONE))
    given(
      paymentConfirmationService.complete(attempt),
    ).willReturn(PaymentConfirmationCompletion.Succeeded(ConfirmPaymentResult(RESERVATION_ID, ReservationStatus.SUCCEEDED), holds))

    service.reconcilePayment(RESERVATION_ID)

    then(redisVenueSeatHoldService).should().finalizeForPayment(GROUP_ID)
    then(performanceVenueSeatStompPublisher).should().publishReservationConfirmed(PERFORMANCE_ID, VENUE_SEAT_IDS)
  }

  @Test
  fun `환불 필요 결제가 취소되면 REFUNDED 처리 후 Hold를 해제한다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(
      com.example.server.reservation.payment.dto.PaymentReconciliationTarget(
        RESERVATION_ID,
        ReservationStatus.REFUND_REQUIRED,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      ),
    )
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.completeRefund(attempt)).willReturn(holds)
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(VENUE_SEAT_IDS)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).should().completeRefund(attempt)
    then(redisVenueSeatHoldService).should().releaseAllVenueSeats(GROUP_ID)
  }

  @Test
  fun `트랜잭션이 활성화되어 있으면 Hold 후처리를 커밋 뒤로 미룬다`() {
    val attempt = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)
    val holds = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).willReturn(PaymentConfirmationStart.Ready(attempt))
    given(
      paymentGateway.confirm(PAYMENT_KEY, ORDER_ID, AMOUNT),
    ).willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT, ExternalPaymentStatus.DONE))
    given(
      paymentConfirmationService.complete(attempt),
    ).willReturn(PaymentConfirmationCompletion.Succeeded(ConfirmPaymentResult(RESERVATION_ID, ReservationStatus.SUCCEEDED), holds))
    given(redisVenueSeatHoldService.finalizeForPayment(GROUP_ID)).willReturn(VENUE_SEAT_IDS)
    TransactionSynchronizationManager.initSynchronization()

    service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
    TransactionSynchronizationManager.getSynchronizations().forEach { it.afterCommit() }
    then(redisVenueSeatHoldService).should().finalizeForPayment(GROUP_ID)
  }

  @Test
  fun `확정 결과에 Hold가 없으면 후처리를 건너뛴다`() {
    val attempt = attempt()
    val result = result()
    givenReady(attempt)
    given(paymentConfirmationService.complete(attempt))
      .willReturn(PaymentConfirmationCompletion.Succeeded(result, null))

    assertThat(service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).isEqualTo(result)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `확정 실패 결과에 Hold가 없어도 결제 취소 후 예외를 반환한다`() {
    val attempt = attempt()
    givenReady(attempt)
    given(paymentConfirmationService.complete(attempt))
      .willReturn(PaymentConfirmationCompletion.RefundRequired(null))
    given(paymentConfirmationService.completeRefund(attempt)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(paymentGateway).should().cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제 취소에 실패하면 환불 완료 처리를 시도하지 않는다`() {
    val attempt = attempt()
    val holds = holds()
    val exception = CustomException(ErrorCode.BAD_GATEWAY, "cancel failed")
    givenReady(attempt)
    given(paymentConfirmationService.complete(attempt)).willReturn(PaymentConfirmationCompletion.RefundRequired(holds))
    willThrow(exception).given(paymentGateway).cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")

    val actual = assertThrows<CustomException> {
      service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
    }

    assertThat(actual).isSameAs(exception)
    then(paymentConfirmationService).should(never()).completeRefund(attempt)
  }

  @Test
  fun `확정 예외 후 환불 전환 대상이 아니면 원래 예외를 유지한다`() {
    val attempt = attempt()
    val failure = IllegalStateException("complete failed")
    givenReady(attempt)
    given(paymentConfirmationService.complete(attempt)).willThrow(failure)
    given(paymentConfirmationService.markRefundRequired(attempt)).willReturn(false)

    assertThat(
      assertThrows<IllegalStateException> {
        service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      },
    ).isSameAs(failure)
    then(paymentGateway).should(never()).cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
  }

  @Test
  fun `대사 대상이 없으면 외부 결제를 조회하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentGateway).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제가 없고 환불 필요 상태면 환불 완료 후 Hold를 해제한다`() {
    val target = target(ReservationStatus.REFUND_REQUIRED)
    val holds = holds()
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
    given(paymentConfirmationService.completeRefund(attempt())).willReturn(holds)
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(VENUE_SEAT_IDS)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).should().completeRefund(attempt())
    then(performanceVenueSeatStompPublisher).should().publishHoldReleased(PERFORMANCE_ID, VENUE_SEAT_IDS)
  }

  @Test
  fun `외부 결제 정보가 일치하지 않으면 로컬 처리를 건너뛴다`() {
    val target = target(ReservationStatus.PAYMENT_CONFIRMING)
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(
      ExternalPayment("other-key", ORDER_ID, AMOUNT + 1, ExternalPaymentStatus.DONE),
    )

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `승인 중 결제가 완료됐지만 로컬 확정이 환불 필요면 결제를 취소한다`() {
    val target = target(ReservationStatus.PAYMENT_CONFIRMING)
    val holds = holds()
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.DONE))
    given(paymentConfirmationService.complete(attempt())).willReturn(PaymentConfirmationCompletion.RefundRequired(holds))
    given(paymentConfirmationService.completeRefund(attempt())).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentGateway).should().cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
  }

  @Test
  fun `승인 중 결제가 취소되면 실패 처리하고 Hold 해제 이벤트를 발행한다`() {
    val target = target(ReservationStatus.PAYMENT_CONFIRMING)
    val holds = holds()
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.markPaymentFailed(attempt())).willReturn(holds)
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(VENUE_SEAT_IDS)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).should().markPaymentFailed(attempt())
    then(performanceVenueSeatStompPublisher).should().publishHoldReleased(PERFORMANCE_ID, VENUE_SEAT_IDS)
  }

  @Test
  fun `부분 취소된 승인 중 결제는 환불 필요 상태로 전환한 뒤 취소한다`() {
    val target = target(ReservationStatus.PAYMENT_CONFIRMING)
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.PARTIAL_CANCELED))
    given(paymentConfirmationService.markRefundRequired(attempt())).willReturn(true)
    given(paymentConfirmationService.completeRefund(attempt())).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).should().markRefundRequired(attempt())
    then(paymentGateway).should().cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
  }

  @Test
  fun `부분 취소된 승인 중 결제가 환불 전환 대상이 아니면 중단한다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.PARTIAL_CANCELED))
    given(paymentConfirmationService.markRefundRequired(attempt())).willReturn(false)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentGateway).shouldHaveNoMoreInteractions()
    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `결제 승인 중 상태에서 아직 처리 중인 외부 상태는 유지한다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.IN_PROGRESS))

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `환불 필요 결제가 완료 또는 부분 취소면 잔여 결제를 취소한다`() {
    listOf(ExternalPaymentStatus.DONE, ExternalPaymentStatus.PARTIAL_CANCELED).forEach { status ->
      given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.REFUND_REQUIRED))
      given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(status))
      given(paymentConfirmationService.completeRefund(attempt())).willReturn(null)

      service.reconcilePayment(RESERVATION_ID)
    }

    then(paymentGateway).should(org.mockito.Mockito.times(2)).cancel(PAYMENT_KEY, "예매 확정에 실패했습니다.", "reservation-refund-$RESERVATION_ID")
    then(paymentGateway).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `환불 필요 결제가 취소되고 Hold가 없으면 이벤트를 발행하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.REFUND_REQUIRED))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.completeRefund(attempt())).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `지원하지 않는 환불 결제 상태는 유지한다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.REFUND_REQUIRED))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.IN_PROGRESS))

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    then(paymentGateway).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `Hold 최종 처리 또는 이벤트 발행 실패가 결제 결과로 전파되지 않는다`() {
    val attempt = attempt()
    val holds = holds()
    givenReady(attempt)
    given(paymentConfirmationService.complete(attempt)).willReturn(PaymentConfirmationCompletion.Succeeded(result(), holds))
    willThrow(IllegalStateException("redis failed")).given(redisVenueSeatHoldService).finalizeForPayment(GROUP_ID)
    willThrow(IllegalStateException("stomp failed")).given(performanceVenueSeatStompPublisher)
      .publishReservationConfirmed(PERFORMANCE_ID, VENUE_SEAT_IDS)

    assertThat(service.confirmPayment(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)).isEqualTo(result())
  }

  @Test
  fun `Hold 해제에서 NOT_FOUND는 조용히 무시한다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.markPaymentFailed(attempt())).willReturn(holds())
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID))
      .willThrow(CustomException(ErrorCode.NOT_FOUND, "already released"))

    service.reconcilePayment(RESERVATION_ID)

    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `Hold 해제에서 일반 예외가 발생해도 대사 호출은 완료한다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.markPaymentFailed(attempt())).willReturn(holds())
    willThrow(IllegalStateException("redis failed")).given(redisVenueSeatHoldService).releaseAllVenueSeats(GROUP_ID)

    service.reconcilePayment(RESERVATION_ID)
  }

  @Test
  fun `외부 결제가 없고 지원하지 않는 상태면 아무 작업도 하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.SUCCEEDED))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제가 있고 지원하지 않는 대사 상태면 아무 작업도 하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.SUCCEEDED))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.DONE))

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제가 없고 승인 실패 처리 대상이 아니면 Hold를 해제하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
    given(paymentConfirmationService.markPaymentFailed(attempt())).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제가 없고 환불 완료 대상이 아니면 Hold를 해제하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.REFUND_REQUIRED))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
    given(paymentConfirmationService.completeRefund(attempt())).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `외부 결제의 주문 ID만 다르면 로컬 처리를 건너뛴다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(ExternalPayment(PAYMENT_KEY, "other-order", AMOUNT, ExternalPaymentStatus.DONE))

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `외부 결제의 금액만 다르면 로컬 처리를 건너뛴다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(ExternalPayment(PAYMENT_KEY, ORDER_ID, AMOUNT + 1, ExternalPaymentStatus.DONE))

    service.reconcilePayment(RESERVATION_ID)

    then(paymentConfirmationService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `승인 중 완료 결제의 로컬 성공 결과에 Hold가 없으면 후처리하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.DONE))
    given(paymentConfirmationService.complete(attempt())).willReturn(PaymentConfirmationCompletion.Succeeded(result(), null))

    service.reconcilePayment(RESERVATION_ID)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `승인 중 취소 결제의 실패 처리 대상이 아니면 이벤트를 발행하지 않는다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.markPaymentFailed(attempt())).willReturn(null)

    service.reconcilePayment(RESERVATION_ID)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `환불 필요 결제가 취소되면 Hold 해제 이벤트를 발행하지 않을 수 있다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.REFUND_REQUIRED))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.completeRefund(attempt())).willReturn(holds())
    given(redisVenueSeatHoldService.releaseAllVenueSeats(GROUP_ID)).willReturn(emptyList())

    service.reconcilePayment(RESERVATION_ID)

    then(redisVenueSeatHoldService).should().releaseAllVenueSeats(GROUP_ID)
    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `Hold 해제의 다른 CustomException도 삼켜 대사 흐름을 유지한다`() {
    given(paymentConfirmationService.findReconciliationTarget(RESERVATION_ID)).willReturn(target(ReservationStatus.PAYMENT_CONFIRMING))
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))
    given(paymentConfirmationService.markPaymentFailed(attempt())).willReturn(holds())
    willThrow(CustomException(ErrorCode.CONFLICT, "changed"))
      .given(redisVenueSeatHoldService)
      .releaseAllVenueSeats(GROUP_ID)

    service.reconcilePayment(RESERVATION_ID)
  }

  private fun holds() = ActiveHoldsSnapshot(GROUP_ID, PERFORMANCE_ID, VENUE_SEAT_IDS)

  private fun target(status: ReservationStatus) = PaymentReconciliationTarget(
    RESERVATION_ID,
    status,
    PAYMENT_KEY,
    ORDER_ID,
    AMOUNT,
  )

  private fun externalPayment(status: ExternalPaymentStatus) = ExternalPayment(
    PAYMENT_KEY,
    ORDER_ID,
    AMOUNT,
    status,
  )

  private fun attempt() = PaymentConfirmationAttempt(RESERVATION_ID, PAYMENT_KEY)

  private fun result() = ConfirmPaymentResult(RESERVATION_ID, ReservationStatus.SUCCEEDED)

  private fun givenReady(attempt: PaymentConfirmationAttempt) {
    given(paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT))
      .willReturn(PaymentConfirmationStart.Ready(attempt))
    given(paymentGateway.confirm(PAYMENT_KEY, ORDER_ID, AMOUNT))
      .willReturn(externalPayment(ExternalPaymentStatus.DONE))
  }

  companion object {
    private const val USER_ID = 1L
    private const val RESERVATION_ID = 501L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = "1:10"
    private const val PAYMENT_KEY = "payment-key"
    private const val ORDER_ID = "order-id"
    private const val AMOUNT = 132_000
    private val VENUE_SEAT_IDS = listOf(101L, 102L)
  }
}

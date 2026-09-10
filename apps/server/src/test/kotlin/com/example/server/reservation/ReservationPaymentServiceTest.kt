package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceSeatStompPublisher
import com.example.server.performance.RedisSeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.reservation.dto.ConfirmPaymentResult
import com.example.server.reservation.dto.ExternalPayment
import com.example.server.reservation.dto.ExternalPaymentStatus
import com.example.server.reservation.dto.PaymentReconciliationTarget
import com.example.server.reservation.types.ReservationStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
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
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
@DisplayName("ReservationPaymentService")
class ReservationPaymentServiceTest {
  @Mock
  lateinit var paymentConfirmationService: ReservationPaymentConfirmationService

  @Mock
  lateinit var redisSeatHoldService: RedisSeatHoldService

  @Mock
  lateinit var paymentGateway: PaymentGateway

  @Mock
  lateinit var performanceSeatStompPublisher: PerformanceSeatStompPublisher

  @InjectMocks
  lateinit var reservationPaymentService: ReservationPaymentService

  @Nested
  @DisplayName("confirmPayment")
  inner class ConfirmPayment {
    @Test
    fun `Toss 승인과 로컬 확정에 성공하면 Hold를 해제하고 확정 이벤트를 발행한다`() {
      val attempt = attempt()
      val hold = hold()
      val result = result()

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result,
            hold = hold,
          ),
        )
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      val actual = reservationPaymentService.confirmPayment(
        userId = USER_ID,
        paymentKey = PAYMENT_KEY,
        orderId = ORDER_ID,
        amount = AMOUNT,
      )

      assertThat(actual).isEqualTo(result)
      then(paymentGateway).should().confirm(
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      )
      then(paymentConfirmationService).should().complete(attempt)
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishReservationConfirmed(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `로컬 확정 결과에 Hold가 없으면 Hold 해제와 이벤트 발행을 건너뛴다`() {
      val attempt = attempt()
      val result = result()

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result,
            hold = null,
          ),
        )

      val actual = reservationPaymentService.confirmPayment(
        USER_ID,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      )

      assertThat(actual).isEqualTo(result)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 성공한 결제면 Toss 승인과 로컬 확정을 다시 요청하지 않는다`() {
      val result = result()

      given(
        paymentConfirmationService.begin(
          userId = USER_ID,
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        ),
      ).willReturn(
        PaymentConfirmationStart.AlreadySucceeded(result),
      )

      val actual = reservationPaymentService.confirmPayment(
        USER_ID,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      )

      assertThat(actual).isEqualTo(result)
      then(paymentGateway).shouldHaveNoInteractions()
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `Toss 승인에 실패하면 로컬 확정과 취소를 요청하지 않는다`() {
      val attempt = attempt()
      val exception = CustomException(
        ErrorCode.BAD_GATEWAY,
        "결제 승인에 실패했습니다.",
      )

      givenConfirmationStart(attempt)

      willThrow(exception)
        .given(paymentGateway)
        .confirm(PAYMENT_KEY, ORDER_ID, AMOUNT)

      val actual = assertThrows<CustomException> {
        reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(actual).isSameAs(exception)
      then(paymentConfirmationService)
        .should(never())
        .complete(attempt)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `로컬 확정에 실패하고 Toss 취소에 성공하면 REFUNDED 처리 후 Hold를 해제한다`() {
      val attempt = attempt()
      val hold = hold()

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.RefundRequired(hold),
        )
      given(paymentConfirmationService.completeRefund(attempt))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      val exception = assertThrows<CustomException> {
        reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception.message)
        .isEqualTo("예매 확정에 실패해 결제를 취소했습니다.")

      then(paymentGateway).should().confirm(
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      )
      then(paymentGateway).should().cancel(
        PAYMENT_KEY,
        "예매 확정에 실패했습니다.",
        "reservation-refund-$RESERVATION_ID",
      )
      then(paymentConfirmationService).should().completeRefund(attempt)
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `로컬 확정에 실패하고 활성 Hold가 없으면 이벤트를 발행하지 않는다`() {
      val attempt = attempt()

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.RefundRequired(null),
        )
      given(paymentConfirmationService.completeRefund(attempt))
        .willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(paymentGateway).should().cancel(
        PAYMENT_KEY,
        "예매 확정에 실패했습니다.",
        "reservation-refund-$RESERVATION_ID",
      )
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `Toss 취소에 실패하면 환불 완료 처리를 요청하지 않는다`() {
      val attempt = attempt()
      val hold = hold()
      val exception = CustomException(
        ErrorCode.BAD_GATEWAY,
        "결제 취소에 실패했습니다.",
      )

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.RefundRequired(hold),
        )
      willThrow(exception)
        .given(paymentGateway)
        .cancel(
          PAYMENT_KEY,
          "예매 확정에 실패했습니다.",
          "reservation-refund-$RESERVATION_ID",
        )

      val actual = assertThrows<CustomException> {
        reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(actual).isSameAs(exception)
      then(paymentConfirmationService)
        .should(never())
        .completeRefund(attempt)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `Toss 승인 후 로컬 확정 예외가 발생하면 환불을 시도한다`() {
      val attempt = attempt()
      val localException = IllegalStateException("reservation seat save failed")

      givenReady(attempt)
      willThrow(localException)
        .given(paymentConfirmationService)
        .complete(attempt)
      given(paymentConfirmationService.markRefundRequired(attempt))
        .willReturn(true)
      given(paymentConfirmationService.completeRefund(attempt))
        .willReturn(null)

      val actual = assertThrows<IllegalStateException> {
        reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(actual).isSameAs(localException)
      then(paymentConfirmationService).should().markRefundRequired(attempt)
      then(paymentGateway).should().cancel(
        PAYMENT_KEY,
        "예매 확정에 실패했습니다.",
        "reservation-refund-$RESERVATION_ID",
      )
      then(paymentConfirmationService).should().completeRefund(attempt)
    }

    @Test
    fun `로컬 확정 예외 후 환불 전환 대상이 아니면 원래 예외를 유지한다`() {
      val attempt = attempt()
      val localException = IllegalStateException("reservation seat save failed")

      givenReady(attempt)
      willThrow(localException)
        .given(paymentConfirmationService)
        .complete(attempt)
      given(paymentConfirmationService.markRefundRequired(attempt))
        .willReturn(false)

      val actual = assertThrows<IllegalStateException> {
        reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(actual).isSameAs(localException)
      then(paymentConfirmationService).should().markRefundRequired(attempt)
      then(paymentGateway).should(never()).cancel(
        PAYMENT_KEY,
        "예매 확정에 실패했습니다.",
        "reservation-refund-$RESERVATION_ID",
      )
    }

    @Test
    fun `Hold 해제와 이벤트 발행은 트랜잭션 커밋 후 수행한다`() {
      val attempt = attempt()
      val hold = hold()
      val result = result()

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result,
            hold = hold,
          ),
        )
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      TransactionSynchronizationManager.initSynchronization()

      try {
        val actual = reservationPaymentService.confirmPayment(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          AMOUNT,
        )

        assertThat(actual).isEqualTo(result)
        then(redisSeatHoldService).shouldHaveNoInteractions()
        then(performanceSeatStompPublisher).shouldHaveNoInteractions()

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { synchronization -> synchronization.afterCommit() }

        then(redisSeatHoldService).should().release(HOLD_ID)
        then(performanceSeatStompPublisher)
          .should()
          .publishReservationConfirmed(
            performanceId = PERFORMANCE_ID,
            seatIds = SEAT_IDS,
          )
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `Hold 해제에 실패해도 예매 확정 이벤트를 발행한다`() {
      val attempt = attempt()
      val hold = hold()
      val result = result()

      givenReady(attempt)
      given(paymentConfirmationService.complete(attempt))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result,
            hold = hold,
          ),
        )
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(null)

      val actual = reservationPaymentService.confirmPayment(
        USER_ID,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      )

      assertThat(actual).isEqualTo(result)
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishReservationConfirmed(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `Toss 승인 결과가 완료 상태가 아니면 로컬 확정을 진행하지 않는다`() {
      val attempt = attempt()

      givenReady(
        attempt = attempt,
        paymentStatus = ExternalPaymentStatus.WAITING_FOR_DEPOSIT,
      )

      val exception = assertThrows<CustomException> {
        reservationPaymentService.confirmPayment(
          userId = USER_ID,
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception.message)
        .isEqualTo("결제 승인 결과를 확인하고 있습니다.")

      then(paymentConfirmationService)
        .should(never())
        .complete(attempt)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("reconcilePayment")
  inner class ReconcilePayment {
    @Test
    fun `대사 대상 예매가 없으면 외부 결제를 조회하지 않는다`() {
      given(
        paymentConfirmationService.findReconciliationTarget(RESERVATION_ID),
      ).willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentGateway).shouldHaveNoInteractions()
    }

    @Test
    fun `승인 중인 결제를 Toss에서 찾을 수 없으면 로컬 실패 처리 후 Hold를 해제한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .markPaymentFailed(attempt())
      then(redisSeatHoldService)
        .should()
        .release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `환불 필요 결제를 Toss에서 찾을 수 없으면 환불 완료 처리 후 Hold를 해제한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .completeRefund(attempt())
      then(redisSeatHoldService)
        .should()
        .release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `외부 paymentKey가 다르면 로컬 상태를 변경하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      given(paymentGateway.find(PAYMENT_KEY))
        .willReturn(
          externalPayment(
            status = ExternalPaymentStatus.DONE,
            paymentKey = "another-payment-key",
          ),
        )

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .findReconciliationTarget(RESERVATION_ID)
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `외부 orderId가 다르면 로컬 상태를 변경하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      given(paymentGateway.find(PAYMENT_KEY))
        .willReturn(
          externalPayment(
            status = ExternalPaymentStatus.DONE,
            orderId = "another-order-id",
          ),
        )

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .findReconciliationTarget(RESERVATION_ID)
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `외부 결제 금액이 다르면 로컬 상태를 변경하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      given(
        paymentGateway.find(PAYMENT_KEY),
      ).willReturn(
        externalPayment(
          status = ExternalPaymentStatus.DONE,
          amount = AMOUNT + 1,
        ),
      )

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .findReconciliationTarget(RESERVATION_ID)
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `승인 중인 결제가 Toss에서 완료되면 로컬 확정 후 예매 확정 이벤트를 발행한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.complete(attempt()))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result(),
            hold = hold,
          ),
        )
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService).should().complete(attempt())
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishReservationConfirmed(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `승인 중인 결제가 완료되어도 Hold가 없으면 이벤트를 발행하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.complete(attempt()))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result(),
            hold = null,
          ),
        )

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService).should().complete(attempt())
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `대사 중 로컬 확정 예외가 발생하면 환불을 시도한다`() {
      val localException = IllegalStateException("reservation seat save failed")

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      willThrow(localException)
        .given(paymentConfirmationService)
        .complete(attempt())
      given(paymentConfirmationService.markRefundRequired(attempt()))
        .willReturn(true)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(null)

      val actual = assertThrows<IllegalStateException> {
        reservationPaymentService.reconcilePayment(RESERVATION_ID)
      }

      assertThat(actual).isSameAs(localException)
      then(paymentConfirmationService).should().markRefundRequired(attempt())
      then(paymentGateway).should().cancel(
        PAYMENT_KEY,
        "예매 확정에 실패했습니다.",
        "reservation-refund-$RESERVATION_ID",
      )
      then(paymentConfirmationService).should().completeRefund(attempt())
    }

    @Test
    fun `승인 중인 결제가 Toss에서 취소되면 로컬 실패 처리 후 Hold를 해제한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService).should().markPaymentFailed(attempt())
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `승인 중인 결제가 취소되어도 로컬 실패 처리 대상이 아니면 이벤트를 발행하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService).should().markPaymentFailed(attempt())
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `승인 중인 결제의 로컬 확정이 실패하면 Toss 취소 후 환불 완료 처리한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.complete(attempt()))
        .willReturn(
          PaymentConfirmationCompletion.RefundRequired(hold),
        )
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentGateway)
        .should()
        .cancel(
          PAYMENT_KEY,
          "예매 확정에 실패했습니다.",
          "reservation-refund-$RESERVATION_ID",
        )
      then(paymentConfirmationService).should().completeRefund(attempt())
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `환불 필요 결제가 Toss에서 완료 상태면 취소 후 환불 완료 처리한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentGateway)
        .should()
        .cancel(
          PAYMENT_KEY,
          "예매 확정에 실패했습니다.",
          "reservation-refund-$RESERVATION_ID",
        )
      then(paymentConfirmationService).should().completeRefund(attempt())
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `환불 필요 결제가 Toss에서 취소되면 환불 완료 처리 후 Hold를 해제한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID)).willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService).should().completeRefund(attempt())
      then(redisSeatHoldService).should().release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
      then(paymentGateway).should().find(PAYMENT_KEY)
      then(paymentGateway).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `환불 필요 결제가 취소되어도 환불 완료 대상이 아니면 이벤트를 발행하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService).should().completeRefund(attempt())
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `환불 필요 결제가 아직 처리 중이면 로컬 상태를 변경하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      givenExternalPayment(ExternalPaymentStatus.IN_PROGRESS)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .findReconciliationTarget(RESERVATION_ID)
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `지원하지 않는 대사 대상 상태면 아무 작업도 하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.SUCCEEDED)
      givenExternalPayment(ExternalPaymentStatus.DONE)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .findReconciliationTarget(RESERVATION_ID)
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `커밋 후 Hold 해제에 실패해도 예매 확정 이벤트를 발행한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.complete(attempt()))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result(),
            hold = hold,
          ),
        )
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(null)

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationPaymentService.reconcilePayment(RESERVATION_ID)

        then(redisSeatHoldService).shouldHaveNoInteractions()
        then(performanceSeatStompPublisher).shouldHaveNoInteractions()

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { synchronization -> synchronization.afterCommit() }

        then(redisSeatHoldService).should().release(HOLD_ID)
        then(performanceSeatStompPublisher)
          .should()
          .publishReservationConfirmed(
            performanceId = PERFORMANCE_ID,
            seatIds = SEAT_IDS,
          )
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `승인 중인 결제가 아직 처리 중이면 로컬 상태를 변경하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.IN_PROGRESS)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .findReconciliationTarget(RESERVATION_ID)
      then(paymentConfirmationService).shouldHaveNoMoreInteractions()
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `승인 중인 결제를 찾을 수 없어도 로컬 실패 처리 대상이 아니면 아무 작업도 하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .markPaymentFailed(attempt())
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `환불 필요 결제를 찾을 수 없어도 환불 완료 대상이 아니면 아무 작업도 하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .completeRefund(attempt())
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `지원하지 않는 대사 대상 상태에서 외부 결제도 없으면 아무 작업도 하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.SUCCEEDED)
      given(paymentGateway.find(PAYMENT_KEY)).willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should(never())
        .markPaymentFailed(attempt())
      then(paymentConfirmationService)
        .should(never())
        .completeRefund(attempt())
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(performanceSeatStompPublisher).shouldHaveNoInteractions()
    }

    @Test
    fun `환불 필요 결제가 부분 취소 상태면 잔여 결제를 취소하고 환불 완료 처리한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.REFUND_REQUIRED)
      givenExternalPayment(ExternalPaymentStatus.PARTIAL_CANCELED)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentGateway)
        .should()
        .cancel(
          PAYMENT_KEY,
          "예매 확정에 실패했습니다.",
          "reservation-refund-$RESERVATION_ID",
        )
      then(paymentConfirmationService)
        .should()
        .completeRefund(attempt())
      then(redisSeatHoldService)
        .should()
        .release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `실패 예매의 Hold 해제와 좌석 이벤트 발행은 트랜잭션 커밋 후 수행한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(hold)

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationPaymentService.reconcilePayment(RESERVATION_ID)

        then(redisSeatHoldService).shouldHaveNoInteractions()
        then(performanceSeatStompPublisher).shouldHaveNoInteractions()

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { synchronization -> synchronization.afterCommit() }

        then(redisSeatHoldService)
          .should()
          .release(HOLD_ID)
        then(performanceSeatStompPublisher)
          .should()
          .publishHoldReleased(
            performanceId = PERFORMANCE_ID,
            seatIds = SEAT_IDS,
          )
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `실패 예매의 Hold 해제에 실패하면 좌석 이벤트를 발행하지 않는다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(null)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(redisSeatHoldService)
        .should()
        .release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .shouldHaveNoInteractions()
    }

    @Test
    fun `트랜잭션 커밋 후 Hold 해제에 실패하면 좌석 이벤트를 발행하지 않는다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.CANCELED)
      given(paymentConfirmationService.markPaymentFailed(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(null)

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationPaymentService.reconcilePayment(RESERVATION_ID)

        then(redisSeatHoldService).shouldHaveNoInteractions()
        then(performanceSeatStompPublisher).shouldHaveNoInteractions()

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { synchronization -> synchronization.afterCommit() }

        then(redisSeatHoldService)
          .should()
          .release(HOLD_ID)
        then(performanceSeatStompPublisher)
          .shouldHaveNoInteractions()
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `승인 중인 결제가 부분 취소 상태면 환불 대기 전환 후 잔여 결제를 취소한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.PARTIAL_CANCELED)
      given(paymentConfirmationService.markRefundRequired(attempt()))
        .willReturn(true)
      given(paymentConfirmationService.completeRefund(attempt()))
        .willReturn(hold)
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(hold)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .markRefundRequired(attempt())
      then(paymentGateway)
        .should()
        .cancel(
          PAYMENT_KEY,
          "예매 확정에 실패했습니다.",
          "reservation-refund-$RESERVATION_ID",
        )
      then(paymentConfirmationService)
        .should()
        .completeRefund(attempt())
      then(redisSeatHoldService)
        .should()
        .release(HOLD_ID)
      then(performanceSeatStompPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )
    }

    @Test
    fun `부분 취소 결제가 환불 전환 대상이 아니면 추가 취소를 요청하지 않는다`() {
      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.PARTIAL_CANCELED)
      given(paymentConfirmationService.markRefundRequired(attempt()))
        .willReturn(false)

      reservationPaymentService.reconcilePayment(RESERVATION_ID)

      then(paymentConfirmationService)
        .should()
        .markRefundRequired(attempt())
      then(paymentGateway)
        .should()
        .find(PAYMENT_KEY)
      then(paymentGateway)
        .shouldHaveNoMoreInteractions()
      then(paymentConfirmationService)
        .shouldHaveNoMoreInteractions()
      then(redisSeatHoldService)
        .shouldHaveNoInteractions()
      then(performanceSeatStompPublisher)
        .shouldHaveNoInteractions()
    }

    @Test
    fun `커밋 후 Hold 해제 예외가 발생해도 예매 확정 이벤트를 발행한다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.complete(attempt()))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result(),
            hold = hold,
          ),
        )

      willThrow(IllegalStateException("Redis unavailable"))
        .given(redisSeatHoldService)
        .release(HOLD_ID)

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationPaymentService.reconcilePayment(RESERVATION_ID)

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { synchronization -> synchronization.afterCommit() }

        then(performanceSeatStompPublisher)
          .should()
          .publishReservationConfirmed(
            performanceId = PERFORMANCE_ID,
            seatIds = SEAT_IDS,
          )
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `커밋 후 예매 확정 이벤트 발행 예외가 대사 호출로 전파되지 않는다`() {
      val hold = hold()

      givenReconciliationTarget(ReservationStatus.PAYMENT_CONFIRMING)
      givenExternalPayment(ExternalPaymentStatus.DONE)
      given(paymentConfirmationService.complete(attempt()))
        .willReturn(
          PaymentConfirmationCompletion.Succeeded(
            result = result(),
            hold = hold,
          ),
        )
      given(redisSeatHoldService.release(HOLD_ID))
        .willReturn(hold)

      willThrow(IllegalStateException("STOMP unavailable"))
        .given(performanceSeatStompPublisher)
        .publishReservationConfirmed(
          performanceId = PERFORMANCE_ID,
          seatIds = SEAT_IDS,
        )

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationPaymentService.reconcilePayment(RESERVATION_ID)

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { synchronization -> synchronization.afterCommit() }

        then(redisSeatHoldService)
          .should()
          .release(HOLD_ID)
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }
  }

  private fun givenReconciliationTarget(status: ReservationStatus) {
    given(
      paymentConfirmationService.findReconciliationTarget(RESERVATION_ID),
    ).willReturn(
      PaymentReconciliationTarget(
        reservationId = RESERVATION_ID,
        status = status,
        paymentKey = PAYMENT_KEY,
        orderId = ORDER_ID,
        amount = AMOUNT,
      ),
    )
  }

  private fun givenExternalPayment(status: ExternalPaymentStatus) {
    given(paymentGateway.find(PAYMENT_KEY))
      .willReturn(externalPayment(status))
  }

  private fun externalPayment(status: ExternalPaymentStatus, paymentKey: String = PAYMENT_KEY, orderId: String = ORDER_ID, amount: Int = AMOUNT) =
    ExternalPayment(
      paymentKey = paymentKey,
      orderId = orderId,
      amount = amount,
      status = status,
    )

  private fun givenReady(attempt: PaymentConfirmationAttempt, paymentStatus: ExternalPaymentStatus = ExternalPaymentStatus.DONE) {
    givenConfirmationStart(attempt)

    given(
      paymentGateway.confirm(
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      ),
    ).willReturn(
      externalPayment(paymentStatus),
    )
  }

  private fun givenConfirmationStart(attempt: PaymentConfirmationAttempt) {
    given(
      paymentConfirmationService.begin(
        userId = USER_ID,
        paymentKey = PAYMENT_KEY,
        orderId = ORDER_ID,
        amount = AMOUNT,
      ),
    ).willReturn(
      PaymentConfirmationStart.Ready(attempt),
    )
  }

  private fun attempt() = PaymentConfirmationAttempt(
    reservationId = RESERVATION_ID,
    paymentKey = PAYMENT_KEY,
  )

  private fun result() = ConfirmPaymentResult(
    reservationId = RESERVATION_ID,
    status = ReservationStatus.SUCCEEDED,
  )

  private fun hold() = SeatHold(
    holdId = HOLD_ID,
    ownerUserId = USER_ID,
    performanceId = PERFORMANCE_ID,
    venueSeatIds = SEAT_IDS,
    expiresAt = LocalDateTime.now().plusMinutes(5),
  )

  private companion object {
    const val USER_ID = 1L
    const val PERFORMANCE_ID = 10L
    const val RESERVATION_ID = 501L
    const val HOLD_ID = "hold-123"
    const val ORDER_ID = "tikkle-order-501"
    const val PAYMENT_KEY = "payment-key"
    const val AMOUNT = 132_000
    val SEAT_IDS = listOf(101L, 102L)
  }
}

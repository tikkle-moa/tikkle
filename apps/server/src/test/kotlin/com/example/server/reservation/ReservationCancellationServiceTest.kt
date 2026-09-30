package com.example.server.reservation

import com.example.server.reservation.dto.ReservationCancellationMessageData
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.dto.RefundReceiveAccount
import com.example.server.reservation.payment.dto.ReservationCancellationAttempt
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.types.ReservationStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.inOrder
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension

@ExtendWith(MockitoExtension::class)
class ReservationCancellationServiceTest {
  @Mock lateinit var transactionService: ReservationCancellationTransactionService

  @Mock lateinit var paymentGateway: PaymentGateway

  @InjectMocks lateinit var service: ReservationCancellationService

  @Test
  fun `Toss 전액 취소 성공 후 예매 취소를 확정한다`() {
    val attempt = attempt()
    val refundAccount = RefundReceiveAccount("088", "0123456789", "홍길동")
    val result = ReservationCancellationMessageData(RESERVATION_ID, ReservationStatus.REFUNDED)
    given(transactionService.begin(USER_ID, RESERVATION_ID)).willReturn(attempt)
    given(transactionService.complete(attempt)).willReturn(result)

    val actual = service.cancelReservation(USER_ID, RESERVATION_ID, refundAccount)

    assertThat(actual).isEqualTo(result)
    val order = inOrder(paymentGateway, transactionService)
    order.verify(paymentGateway).cancel(
      PAYMENT_KEY,
      "사용자 요청으로 예매를 취소했습니다.",
      "reservation-cancel-$RESERVATION_ID",
      refundAccount,
    )
    order.verify(transactionService).complete(attempt)
  }

  @Test
  fun `Toss 취소 실패 시 예매 확정을 호출하지 않는다`() {
    val attempt = attempt()
    val failure = IllegalStateException("결제 취소 실패")
    given(transactionService.begin(USER_ID, RESERVATION_ID)).willReturn(attempt)
    willThrow(failure).given(paymentGateway).cancel(
      PAYMENT_KEY,
      "사용자 요청으로 예매를 취소했습니다.",
      "reservation-cancel-$RESERVATION_ID",
      null,
    )

    val thrown = assertThrows<IllegalStateException> {
      service.cancelReservation(USER_ID, RESERVATION_ID, null)
    }

    assertThat(thrown).isSameAs(failure)
    then(transactionService).should(never()).complete(attempt)
  }

  @Test
  fun `이미 환불된 예매의 재요청은 Toss를 다시 호출하지 않는다`() {
    val result = ReservationCancellationMessageData(RESERVATION_ID, ReservationStatus.REFUNDED)
    given(transactionService.begin(USER_ID, RESERVATION_ID)).willReturn(null)

    assertThat(service.cancelReservation(USER_ID, RESERVATION_ID, null)).isEqualTo(result)

    then(paymentGateway).shouldHaveNoInteractions()
    then(transactionService).should(never()).complete(attempt())
  }

  @Test
  fun `Toss가 이미 취소한 결제는 로컬 예매 상태를 환불 완료로 맞춘다`() {
    val attempt = attempt()
    given(transactionService.findPending(RESERVATION_ID)).willReturn(attempt)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.CANCELED))

    service.reconcileCancellation(RESERVATION_ID)

    then(transactionService).should().complete(attempt)
    then(paymentGateway).should(never()).cancel(PAYMENT_KEY, "사용자 요청으로 예매를 취소했습니다.", "reservation-cancel-$RESERVATION_ID", null)
  }

  @Test
  fun `Toss 결제 상태와 금액이 일치하지 않으면 대사를 보류한다`() {
    val attempt = attempt()
    given(transactionService.findPending(RESERVATION_ID)).willReturn(attempt)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(externalPayment(ExternalPaymentStatus.DONE, amount = AMOUNT + 1))

    service.reconcileCancellation(RESERVATION_ID)

    then(paymentGateway).should(never()).cancel(PAYMENT_KEY, "사용자 요청으로 예매를 취소했습니다.", "reservation-cancel-$RESERVATION_ID", null)
    then(transactionService).should(never()).complete(attempt)
  }

  @Test
  fun `입금된 가상계좌는 환불 계좌 없이 자동 취소를 재시도하지 않는다`() {
    val attempt = attempt()
    given(transactionService.findPending(RESERVATION_ID)).willReturn(attempt)
    given(paymentGateway.find(PAYMENT_KEY)).willReturn(
      externalPayment(ExternalPaymentStatus.DONE, method = "가상계좌"),
    )

    service.reconcileCancellation(RESERVATION_ID)

    then(paymentGateway).should(never())
      .cancel(PAYMENT_KEY, "사용자 요청으로 예매를 취소했습니다.", "reservation-cancel-$RESERVATION_ID", null)
    then(transactionService).should(never()).complete(attempt)
  }

  private fun attempt() = ReservationCancellationAttempt(RESERVATION_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)

  private fun externalPayment(status: ExternalPaymentStatus, amount: Int = AMOUNT, method: String? = null) =
    ExternalPayment(PAYMENT_KEY, ORDER_ID, amount, status, method)

  private companion object {
    const val USER_ID = 1L
    const val RESERVATION_ID = 501L
    const val PAYMENT_KEY = "payment-key"
    const val ORDER_ID = "order-id"
    const val AMOUNT = 66_000
  }
}

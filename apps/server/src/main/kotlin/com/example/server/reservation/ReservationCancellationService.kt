package com.example.server.reservation

import com.example.server.reservation.dto.ReservationCancellationMessageData
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.RefundReceiveAccount
import com.example.server.reservation.payment.dto.ReservationCancellationAttempt
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.types.ReservationStatus
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class ReservationCancellationService(
  private val transactionService: ReservationCancellationTransactionService,
  private val paymentGateway: PaymentGateway,
) {
  fun cancelReservation(
    userId: Long,
    reservationId: Long,
    requestId: UUID,
    refundReceiveAccount: RefundReceiveAccount?,
  ): ReservationCancellationMessageData {
    val attempt = transactionService.begin(userId, reservationId)
      ?: return ReservationCancellationMessageData(reservationId, ReservationStatus.REFUNDED)

    cancelPayment(attempt, refundReceiveAccount, requestId)
    return transactionService.complete(attempt)
  }

  fun reconcileCancellation(reservationId: Long) {
    val attempt = transactionService.findPending(reservationId) ?: return
    val payment = paymentGateway.find(attempt.paymentKey) ?: return

    if (
      payment.paymentKey != attempt.paymentKey ||
      payment.orderId != attempt.orderId ||
      payment.amount != attempt.amount
    ) {
      return
    }

    if (payment.status != ExternalPaymentStatus.CANCELED && payment.method == VIRTUAL_ACCOUNT_METHOD) return

    when (payment.status) {
      ExternalPaymentStatus.CANCELED -> transactionService.complete(attempt)
      ExternalPaymentStatus.DONE,
      ExternalPaymentStatus.PARTIAL_CANCELED,
      -> {
        cancelPayment(attempt)
        transactionService.complete(attempt)
      }

      ExternalPaymentStatus.READY,
      ExternalPaymentStatus.IN_PROGRESS,
      ExternalPaymentStatus.WAITING_FOR_DEPOSIT,
      ExternalPaymentStatus.ABORTED,
      ExternalPaymentStatus.EXPIRED,
      -> Unit
    }
  }

  private fun cancelPayment(attempt: ReservationCancellationAttempt, refundReceiveAccount: RefundReceiveAccount? = null, requestId: UUID? = null) {
    paymentGateway.cancel(
      paymentKey = attempt.paymentKey,
      cancelReason = CANCEL_REASON,
      idempotencyKey = idempotencyKey(attempt.reservationId, requestId, refundReceiveAccount),
      refundReceiveAccount = refundReceiveAccount,
    )
  }

  private fun idempotencyKey(reservationId: Long, requestId: UUID?, refundReceiveAccount: RefundReceiveAccount?): String {
    val reservationKey = "reservation-cancel-$reservationId"
    // 수정된 환불 계좌 요청은 새 STOMP 요청 ID로 구분하고, 계좌 없는 재시도는 대사 작업과 같은 키를 씁니다.
    return if (refundReceiveAccount == null) reservationKey else "$reservationKey-${requireNotNull(requestId)}"
  }

  private companion object {
    const val CANCEL_REASON = "사용자 요청으로 예매를 취소했습니다."
    const val VIRTUAL_ACCOUNT_METHOD = "가상계좌"
  }
}

package com.example.server.reservation

import com.example.server.reservation.dto.ReservationCancellationMessageData
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.RefundReceiveAccount
import com.example.server.reservation.payment.dto.ReservationCancellationAttempt
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.types.ReservationStatus
import org.springframework.stereotype.Service

@Service
class ReservationCancellationService(
  private val transactionService: ReservationCancellationTransactionService,
  private val paymentGateway: PaymentGateway,
) {
  fun cancelReservation(userId: Long, reservationId: Long, refundReceiveAccount: RefundReceiveAccount?): ReservationCancellationMessageData {
    val attempt = transactionService.begin(userId, reservationId)
      ?: return ReservationCancellationMessageData(reservationId, ReservationStatus.REFUNDED)

    cancelPayment(attempt, refundReceiveAccount)
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

  private fun cancelPayment(attempt: ReservationCancellationAttempt, refundReceiveAccount: RefundReceiveAccount? = null) {
    paymentGateway.cancel(
      paymentKey = attempt.paymentKey,
      cancelReason = CANCEL_REASON,
      idempotencyKey = idempotencyKey(attempt.reservationId),
      refundReceiveAccount = refundReceiveAccount,
    )
  }

  private fun idempotencyKey(reservationId: Long) = "reservation-cancel-$reservationId"

  private companion object {
    const val CANCEL_REASON = "사용자 요청으로 예매를 취소했습니다."
    const val VIRTUAL_ACCOUNT_METHOD = "가상계좌"
  }
}

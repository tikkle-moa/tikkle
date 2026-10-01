package com.example.server.reservation

import com.example.server.reservation.dto.ReservationCancellationResult
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.ExternalPayment
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
  private val statusStompPublisher: ReservationStatusStompPublisher,
) {
  fun cancelReservation(
    userId: Long,
    reservationId: Long,
    requestId: UUID,
    refundReceiveAccount: RefundReceiveAccount?,
  ): ReservationCancellationResult {
    val attempt = transactionService.begin(userId, reservationId)
      ?: return ReservationCancellationResult(reservationId, ReservationStatus.REFUNDED)

    statusStompPublisher.publish(attempt.userId, reservationId, ReservationStatus.CANCELLATION_PENDING)

    try {
      cancelPayment(attempt, refundReceiveAccount, requestId)
    } catch (_: Exception) {
      val payment = runCatching { paymentGateway.find(attempt.paymentKey) }.getOrNull()
      if (payment != null && isSamePayment(payment, attempt)) {
        if (payment.status == ExternalPaymentStatus.CANCELED) {
          return completeAndPublish(attempt)
        }

        if (
          refundReceiveAccount == null &&
          payment.method == VIRTUAL_ACCOUNT_METHOD &&
          payment.status in setOf(ExternalPaymentStatus.DONE, ExternalPaymentStatus.PARTIAL_CANCELED)
        ) {
          return requireRefundAccountAndPublish(attempt)
        }
      }

      return ReservationCancellationResult(reservationId, ReservationStatus.CANCELLATION_PENDING)
    }

    return completeAndPublish(attempt)
  }

  fun reconcileCancellation(reservationId: Long) {
    val attempt = transactionService.findPending(reservationId) ?: return
    val payment = paymentGateway.find(attempt.paymentKey) ?: return

    if (!isSamePayment(payment, attempt)) return

    when (payment.status) {
      ExternalPaymentStatus.CANCELED -> completeAndPublish(attempt)
      ExternalPaymentStatus.DONE,
      ExternalPaymentStatus.PARTIAL_CANCELED,
      -> {
        if (payment.method == VIRTUAL_ACCOUNT_METHOD) {
          requireRefundAccountAndPublish(attempt)
        } else {
          cancelPayment(attempt)
          completeAndPublish(attempt)
        }
      }

      ExternalPaymentStatus.READY,
      ExternalPaymentStatus.IN_PROGRESS,
      ExternalPaymentStatus.WAITING_FOR_DEPOSIT,
      ExternalPaymentStatus.ABORTED,
      ExternalPaymentStatus.EXPIRED,
      -> Unit
    }
  }

  private fun completeAndPublish(attempt: ReservationCancellationAttempt): ReservationCancellationResult {
    val result = transactionService.complete(attempt)
    statusStompPublisher.publish(attempt.userId, attempt.reservationId, result.status)
    return result
  }

  private fun requireRefundAccountAndPublish(attempt: ReservationCancellationAttempt): ReservationCancellationResult {
    val result = transactionService.requireRefundAccount(attempt)
    statusStompPublisher.publish(attempt.userId, attempt.reservationId, result.status)
    return result
  }

  private fun isSamePayment(payment: ExternalPayment, attempt: ReservationCancellationAttempt) =
    payment.paymentKey == attempt.paymentKey && payment.orderId == attempt.orderId && payment.amount == attempt.amount

  private fun cancelPayment(
    attempt: ReservationCancellationAttempt,
    refundReceiveAccount: RefundReceiveAccount? = null,
    requestId: UUID = UUID.randomUUID(),
  ) {
    // REST 재전송은 같은 requestId를 쓰고, Toss 상태 확인 후의 대사 재시도는 새 UUID를 사용합니다.
    paymentGateway.cancel(
      paymentKey = attempt.paymentKey,
      cancelReason = CANCEL_REASON,
      idempotencyKey = idempotencyKey(attempt.reservationId, requestId),
      refundReceiveAccount = refundReceiveAccount,
    )
  }

  private fun idempotencyKey(reservationId: Long, requestId: UUID) = "reservation-cancel-$reservationId-$requestId"

  private companion object {
    const val CANCEL_REASON = "사용자 요청으로 예매를 취소했습니다."
    const val VIRTUAL_ACCOUNT_METHOD = "가상계좌"
  }
}

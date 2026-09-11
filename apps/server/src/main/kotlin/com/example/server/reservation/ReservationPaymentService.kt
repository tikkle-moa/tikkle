package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceSeatStompPublisher
import com.example.server.performance.RedisSeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.ConfirmPaymentResult
import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.types.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager

@Service
class ReservationPaymentService(
  private val paymentConfirmationService: ReservationPaymentConfirmationService,
  private val redisSeatHoldService: RedisSeatHoldService,
  private val paymentGateway: PaymentGateway,
  private val performanceSeatStompPublisher: PerformanceSeatStompPublisher,
) {
  private val log = LoggerFactory.getLogger(
    ReservationPaymentService::class.java,
  )

  fun confirmPayment(userId: Long, paymentKey: String, orderId: String, amount: Int): ConfirmPaymentResult {
    val attempt = when (
      val started = paymentConfirmationService.begin(
        userId = userId,
        paymentKey = paymentKey,
        orderId = orderId,
        amount = amount,
      )
    ) {
      is PaymentConfirmationStart.AlreadySucceeded -> return started.result
      is PaymentConfirmationStart.Ready -> started.attempt
    }

    val payment = paymentGateway.confirm(
      paymentKey = paymentKey,
      orderId = orderId,
      amount = amount,
    )

    if (payment.status != ExternalPaymentStatus.DONE) {
      throw CustomException(
        ErrorCode.CONFLICT,
        "결제 승인 결과를 확인하고 있습니다.",
      )
    }

    return when (val completed = completeApprovedPayment(attempt)) {
      is PaymentConfirmationCompletion.Succeeded -> {
        completed.hold?.let { hold ->
          releaseHoldAndPublishReservationConfirmed(hold)
        }

        completed.result
      }

      is PaymentConfirmationCompletion.RefundRequired -> {
        cancelAndCompleteRefund(attempt)

        throw CustomException(
          ErrorCode.CONFLICT,
          "예매 확정에 실패해 결제를 취소했습니다.",
        )
      }
    }
  }

  fun reconcilePayment(reservationId: Long) {
    val target = paymentConfirmationService.findReconciliationTarget(
      reservationId,
    ) ?: return

    val attempt = PaymentConfirmationAttempt(
      reservationId = target.reservationId,
      paymentKey = target.paymentKey,
    )

    val payment = paymentGateway.find(target.paymentKey)

    if (payment == null) {
      when (target.status) {
        ReservationStatus.PAYMENT_CONFIRMING -> {
          paymentConfirmationService
            .markPaymentFailed(attempt)
            ?.let { hold ->
              releaseHoldAfterCommit(hold.holdId) { releasedHold ->
                performanceSeatStompPublisher.publishHoldReleased(
                  performanceId = releasedHold.performanceId,
                  seatIds = releasedHold.venueSeatIds,
                )
              }
            }
        }

        ReservationStatus.REFUND_REQUIRED -> {
          paymentConfirmationService
            .completeRefund(attempt)
            ?.let { hold ->
              releaseHoldAfterCommit(hold.holdId) { releasedHold ->
                performanceSeatStompPublisher.publishHoldReleased(
                  performanceId = releasedHold.performanceId,
                  seatIds = releasedHold.venueSeatIds,
                )
              }
            }
        }

        else -> Unit
      }

      return
    }

    if (
      payment.paymentKey != target.paymentKey ||
      payment.orderId != target.orderId ||
      payment.amount != target.amount
    ) {
      return
    }

    when (target.status) {
      ReservationStatus.PAYMENT_CONFIRMING -> {
        reconcileConfirmingPayment(
          attempt = attempt,
          payment = payment,
        )
      }

      ReservationStatus.REFUND_REQUIRED -> {
        reconcileRefundRequiredPayment(
          attempt = attempt,
          payment = payment,
        )
      }

      else -> Unit
    }
  }

  private fun reconcileConfirmingPayment(attempt: PaymentConfirmationAttempt, payment: ExternalPayment) {
    when (payment.status) {
      ExternalPaymentStatus.DONE -> {
        when (val completed = completeApprovedPayment(attempt)) {
          is PaymentConfirmationCompletion.Succeeded -> {
            completed.hold?.let { hold ->
              releaseHoldAndPublishReservationConfirmed(hold)
            }
          }

          is PaymentConfirmationCompletion.RefundRequired -> {
            cancelAndCompleteRefund(attempt)
          }
        }
      }

      ExternalPaymentStatus.CANCELED,
      ExternalPaymentStatus.ABORTED,
      ExternalPaymentStatus.EXPIRED,
      -> {
        paymentConfirmationService
          .markPaymentFailed(attempt)
          ?.let { hold ->
            releaseHoldAfterCommit(hold.holdId) { releasedHold ->
              performanceSeatStompPublisher.publishHoldReleased(
                performanceId = releasedHold.performanceId,
                seatIds = releasedHold.venueSeatIds,
              )
            }
          }
      }

      ExternalPaymentStatus.PARTIAL_CANCELED -> {
        if (paymentConfirmationService.markRefundRequired(attempt)) {
          cancelAndCompleteRefund(attempt)
        }
      }

      ExternalPaymentStatus.READY,
      ExternalPaymentStatus.IN_PROGRESS,
      ExternalPaymentStatus.WAITING_FOR_DEPOSIT,
      -> Unit
    }
  }

  private fun reconcileRefundRequiredPayment(attempt: PaymentConfirmationAttempt, payment: ExternalPayment) {
    when (payment.status) {
      ExternalPaymentStatus.DONE,
      ExternalPaymentStatus.PARTIAL_CANCELED,
      -> {
        cancelAndCompleteRefund(attempt)
      }

      ExternalPaymentStatus.CANCELED -> {
        paymentConfirmationService
          .completeRefund(attempt)
          ?.let { hold ->
            releaseHoldAfterCommit(hold.holdId) { releasedHold ->
              performanceSeatStompPublisher.publishHoldReleased(
                performanceId = releasedHold.performanceId,
                seatIds = releasedHold.venueSeatIds,
              )
            }
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

  private fun cancelAndCompleteRefund(attempt: PaymentConfirmationAttempt) {
    paymentGateway.cancel(
      paymentKey = attempt.paymentKey,
      cancelReason = REFUND_CANCEL_REASON,
      idempotencyKey = "reservation-refund-${attempt.reservationId}",
    )

    paymentConfirmationService
      .completeRefund(attempt)
      ?.let { hold ->
        releaseHoldAfterCommit(hold.holdId) { releasedHold ->
          performanceSeatStompPublisher.publishHoldReleased(
            performanceId = releasedHold.performanceId,
            seatIds = releasedHold.venueSeatIds,
          )
        }
      }
  }

  private fun completeApprovedPayment(attempt: PaymentConfirmationAttempt): PaymentConfirmationCompletion = try {
    paymentConfirmationService.complete(attempt)
  } catch (exception: Exception) {
    if (paymentConfirmationService.markRefundRequired(attempt)) {
      cancelAndCompleteRefund(attempt)
    }

    throw exception
  }

  private fun releaseHoldAndPublishReservationConfirmed(hold: SeatHold) {
    fun releaseAndPublish() {
      try {
        redisSeatHoldService.release(hold.holdId)
      } catch (exception: Exception) {
        log.error(
          "예매 확정 후 Hold 해제에 실패했습니다. holdId={}",
          hold.holdId,
          exception,
        )
      }

      try {
        performanceSeatStompPublisher.publishReservationConfirmed(
          performanceId = hold.performanceId,
          seatIds = hold.venueSeatIds,
        )
      } catch (exception: Exception) {
        log.error(
          "예매 확정 이벤트 발행에 실패했습니다. performanceId={}, seatIds={}",
          hold.performanceId,
          hold.venueSeatIds,
          exception,
        )
      }
    }

    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      releaseAndPublish()
      return
    }

    TransactionSynchronizationManager.registerSynchronization(
      object : TransactionSynchronization {
        override fun afterCommit() {
          releaseAndPublish()
        }
      },
    )
  }

  private fun releaseHoldAfterCommit(holdId: String, onReleased: (SeatHold) -> Unit) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      redisSeatHoldService.release(holdId)?.let(onReleased)
      return
    }

    TransactionSynchronizationManager.registerSynchronization(
      object : TransactionSynchronization {
        override fun afterCommit() {
          redisSeatHoldService.release(holdId)?.let(onReleased)
        }
      },
    )
  }

  private companion object {
    const val REFUND_CANCEL_REASON = "예매 확정에 실패했습니다."
  }
}

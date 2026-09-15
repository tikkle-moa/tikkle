package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceVenueSeatStompPublisher
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.reservation.dto.ConfirmPaymentMessage
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.ActiveHoldsSnapshot
import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.dto.PaymentConfirmationAttempt
import com.example.server.reservation.payment.dto.PaymentConfirmationCompletion
import com.example.server.reservation.payment.dto.PaymentConfirmationStart
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.types.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager

@Service
class ReservationPaymentService(
  private val paymentConfirmationService: ReservationPaymentConfirmationService,
  private val redisVenueSeatHoldService: RedisVenueSeatHoldService,
  private val paymentGateway: PaymentGateway,
  private val performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher,
) {
  private val log = LoggerFactory.getLogger(ReservationPaymentService::class.java)

  fun confirmPayment(userId: Long, paymentKey: String, orderId: String, amount: Int): ConfirmPaymentMessage {
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
        completed.holds?.let(::finalizeHoldsAndPublishReservationConfirmed)
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
            ?.let(::releaseHoldsAfterCommit)
        }

        ReservationStatus.REFUND_REQUIRED -> {
          paymentConfirmationService
            .completeRefund(attempt)
            ?.let(::releaseHoldsAfterCommit)
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
            completed.holds?.let(::finalizeHoldsAndPublishReservationConfirmed)
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
          ?.let(::releaseHoldsAfterCommit)
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
          ?.let(::releaseHoldsAfterCommit)
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
      cancelReason = "예매 확정에 실패했습니다.",
      idempotencyKey = "reservation-refund-${attempt.reservationId}",
    )

    paymentConfirmationService
      .completeRefund(attempt)
      ?.let(::releaseHoldsAfterCommit)
  }

  private fun completeApprovedPayment(attempt: PaymentConfirmationAttempt): PaymentConfirmationCompletion = try {
    paymentConfirmationService.complete(attempt)
  } catch (exception: Exception) {
    if (paymentConfirmationService.markRefundRequired(attempt)) {
      cancelAndCompleteRefund(attempt)
    }
    throw exception
  }

  private fun finalizeHoldsAndPublishReservationConfirmed(holds: ActiveHoldsSnapshot) {
    val finalize = {
      try {
        redisVenueSeatHoldService.finalizeForPayment(holds.groupId)
      } catch (exception: Exception) {
        log.error(
          "예매 확정 후 Hold 최종 처리에 실패했습니다. groupId={}",
          holds.groupId,
          exception,
        )
      }

      try {
        performanceVenueSeatStompPublisher.publishReservationConfirmed(
          performanceId = holds.performanceId,
          venueSeatIds = holds.venueSeatIds,
        )
      } catch (exception: Exception) {
        log.error(
          "예매 확정 이벤트 발행에 실패했습니다. performanceId={}, venueSeatIds={}",
          holds.performanceId,
          holds.venueSeatIds,
          exception,
        )
      }
    }

    runAfterCommit(finalize)
  }

  private fun releaseHoldsAfterCommit(holds: ActiveHoldsSnapshot) {
    val release = {
      try {
        val releasedVenueSeatIds = redisVenueSeatHoldService.releaseAllVenueSeats(holds.groupId)

        if (releasedVenueSeatIds.isNotEmpty()) {
          performanceVenueSeatStompPublisher.publishHoldReleased(
            performanceId = holds.performanceId,
            venueSeatIds = releasedVenueSeatIds,
          )
        }
      } catch (exception: Exception) {
        if (exception !is CustomException || exception.errorCode != ErrorCode.NOT_FOUND) {
          log.error(
            "Hold 해제에 실패했습니다. groupId={}",
            holds.groupId,
            exception,
          )
        }
      }
    }

    runAfterCommit(release)
  }

  private fun runAfterCommit(action: () -> Unit) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      action()
      return
    }

    TransactionSynchronizationManager.registerSynchronization(
      object : TransactionSynchronization {
        override fun afterCommit() {
          action()
        }
      },
    )
  }
}

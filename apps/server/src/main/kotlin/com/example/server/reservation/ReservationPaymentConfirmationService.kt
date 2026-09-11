package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.RedisSeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.payment.dto.ConfirmPaymentResult
import com.example.server.reservation.payment.dto.PaymentReconciliationTarget
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class ReservationPaymentConfirmationService(
  private val reservationRepository: ReservationRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val redisSeatHoldService: RedisSeatHoldService,
) {
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  fun begin(userId: Long, paymentKey: String, orderId: String, amount: Int): PaymentConfirmationStart {
    val reservation = reservationRepository.findByOrderIdForUpdate(orderId)
      ?: throw CustomException(
        ErrorCode.NOT_FOUND,
        "결제 대상 예매를 찾을 수 없습니다.",
      )

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    when (reservation.status) {
      ReservationStatus.SUCCEEDED -> {
        if (
          reservation.paymentKey == paymentKey &&
          reservation.amount == amount
        ) {
          return PaymentConfirmationStart.AlreadySucceeded(
            ConfirmPaymentResult.from(reservation),
          )
        }

        throw CustomException(ErrorCode.CONFLICT, "이미 종료된 결제입니다.")
      }

      ReservationStatus.PAYMENT_CONFIRMING ->
        throw CustomException(
          ErrorCode.CONFLICT,
          "결제 승인 결과를 확인하고 있습니다.",
        )

      ReservationStatus.REFUND_REQUIRED ->
        throw CustomException(
          ErrorCode.CONFLICT,
          "결제 취소 또는 환불 확인이 필요합니다.",
        )

      ReservationStatus.FAILED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED,
      ReservationStatus.REFUNDED,
      ->
        throw CustomException(ErrorCode.CONFLICT, "이미 종료된 결제 요청입니다.")

      ReservationStatus.PAYMENT_PENDING -> Unit
    }

    if (reservation.amount != amount) {
      throw CustomException(ErrorCode.BAD_REQUEST, "결제 금액이 일치하지 않습니다.")
    }

    if (!reservation.paymentExpiresAt.isAfter(LocalDateTime.now())) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")
    }

    val hold = redisSeatHoldService.findActive(reservation.holdId)
      ?: throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")

    if (hold.ownerUserId != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    if (hold.performanceId != reservation.performance.id) {
      throw CustomException(
        ErrorCode.CONFLICT,
        "예매와 좌석 점유의 공연 회차가 일치하지 않습니다.",
      )
    }

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(
      venueId = reservation.performance.concert.venue.id,
      venueSeatIds = hold.venueSeatIds,
    )

    if (venueSeats.size != hold.venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    if (
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(
        performanceId = reservation.performance.id,
        venueSeatIds = hold.venueSeatIds,
      )
    ) {
      throw CustomException(ErrorCode.CONFLICT, "이미 예매된 좌석이 포함되어 있습니다.")
    }

    reservation.status = ReservationStatus.PAYMENT_CONFIRMING
    reservation.paymentAttemptKey = paymentKey
    reservation.paymentConfirmingAt = LocalDateTime.now()

    return PaymentConfirmationStart.Ready(
      PaymentConfirmationAttempt(
        reservationId = reservation.id,
        paymentKey = paymentKey,
      ),
    )
  }

  @Transactional
  fun complete(attempt: PaymentConfirmationAttempt): PaymentConfirmationCompletion {
    val reservation = reservationRepository.findByIdForUpdate(
      attempt.reservationId,
    ) ?: throw CustomException(
      ErrorCode.NOT_FOUND,
      "결제 대상 예매를 찾을 수 없습니다.",
    )

    if (reservation.status == ReservationStatus.SUCCEEDED) {
      return PaymentConfirmationCompletion.Succeeded(
        result = ConfirmPaymentResult.from(reservation),
        hold = null,
      )
    }

    if (reservation.status == ReservationStatus.REFUND_REQUIRED) {
      return PaymentConfirmationCompletion.RefundRequired(
        hold = null,
      )
    }

    if (reservation.status != ReservationStatus.PAYMENT_CONFIRMING) {
      throw CustomException(
        ErrorCode.CONFLICT,
        "결제 승인 상태가 아닙니다.",
      )
    }

    if (reservation.paymentAttemptKey != attempt.paymentKey) {
      throw IllegalStateException("결제 승인 시도 키가 일치하지 않습니다.")
    }

    val hold = redisSeatHoldService.findActive(reservation.holdId)

    if (
      hold == null ||
      hold.performanceId != reservation.performance.id ||
      !reservation.paymentExpiresAt.isAfter(LocalDateTime.now())
    ) {
      reservation.status = ReservationStatus.REFUND_REQUIRED

      return PaymentConfirmationCompletion.RefundRequired(
        hold = hold,
      )
    }

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(
      venueId = reservation.performance.concert.venue.id,
      venueSeatIds = hold.venueSeatIds,
    )

    if (
      venueSeats.size != hold.venueSeatIds.size ||
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(
        performanceId = reservation.performance.id,
        venueSeatIds = hold.venueSeatIds,
      )
    ) {
      reservation.status = ReservationStatus.REFUND_REQUIRED

      return PaymentConfirmationCompletion.RefundRequired(
        hold = hold,
      )
    }

    reservation.status = ReservationStatus.SUCCEEDED
    reservation.paymentKey = attempt.paymentKey

    reservationSeatRepository.saveAll(
      venueSeats.map { venueSeat ->
        ReservationSeat(
          reservation = reservation,
          performance = reservation.performance,
          venueSeat = venueSeat,
        )
      },
    )

    return PaymentConfirmationCompletion.Succeeded(
      result = ConfirmPaymentResult.from(reservation),
      hold = hold,
    )
  }

  @Transactional
  fun markRefundRequired(attempt: PaymentConfirmationAttempt): Boolean {
    val reservation = reservationRepository.findByIdForUpdate(
      attempt.reservationId,
    ) ?: return false

    if (reservation.paymentAttemptKey != attempt.paymentKey) {
      return false
    }

    if (reservation.status == ReservationStatus.REFUND_REQUIRED) {
      return true
    }

    if (reservation.status != ReservationStatus.PAYMENT_CONFIRMING) {
      return false
    }

    reservation.status = ReservationStatus.REFUND_REQUIRED
    return true
  }

  @Transactional
  fun completeRefund(attempt: PaymentConfirmationAttempt): SeatHold? {
    val reservation = reservationRepository.findByIdForUpdate(
      attempt.reservationId,
    ) ?: return null

    if (
      reservation.status != ReservationStatus.REFUND_REQUIRED ||
      reservation.paymentAttemptKey != attempt.paymentKey
    ) {
      return null
    }

    reservation.status = ReservationStatus.REFUNDED
    return redisSeatHoldService.findActive(reservation.holdId)
  }

  fun findReconciliationTarget(reservationId: Long): PaymentReconciliationTarget? {
    val reservation = reservationRepository.findById(reservationId)
      .orElse(null)
      ?: return null

    if (
      reservation.status != ReservationStatus.PAYMENT_CONFIRMING &&
      reservation.status != ReservationStatus.REFUND_REQUIRED
    ) {
      return null
    }

    val paymentKey = reservation.paymentAttemptKey
      ?: return null

    return PaymentReconciliationTarget(
      reservationId = reservation.id,
      status = reservation.status,
      paymentKey = paymentKey,
      orderId = reservation.orderId,
      amount = reservation.amount,
    )
  }

  @Transactional
  fun markPaymentFailed(attempt: PaymentConfirmationAttempt): SeatHold? {
    val reservation = reservationRepository.findByIdForUpdate(
      attempt.reservationId,
    ) ?: return null

    if (
      reservation.status != ReservationStatus.PAYMENT_CONFIRMING ||
      reservation.paymentAttemptKey != attempt.paymentKey
    ) {
      return null
    }

    reservation.status = ReservationStatus.FAILED
    return redisSeatHoldService.findActive(reservation.holdId)
  }
}

sealed interface PaymentConfirmationStart {
  data class Ready(val attempt: PaymentConfirmationAttempt) : PaymentConfirmationStart

  data class AlreadySucceeded(val result: ConfirmPaymentResult) : PaymentConfirmationStart
}

data class PaymentConfirmationAttempt(val reservationId: Long, val paymentKey: String)

sealed interface PaymentConfirmationCompletion {
  data class Succeeded(val result: ConfirmPaymentResult, val hold: SeatHold?) : PaymentConfirmationCompletion

  data class RefundRequired(val hold: SeatHold?) : PaymentConfirmationCompletion
}

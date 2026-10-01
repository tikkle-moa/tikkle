package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.OutboxEventService
import com.example.server.reservation.dto.ReservationCancellationResult
import com.example.server.reservation.payment.dto.ReservationCancellationAttempt
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class ReservationCancellationTransactionService(
  private val reservationRepository: ReservationRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
  private val outboxEventService: OutboxEventService,
) {
  @Transactional(propagation = Propagation.REQUIRES_NEW)
  fun begin(userId: Long, reservationId: Long): ReservationCancellationAttempt? {
    val reservation = reservationRepository.findByIdForUpdate(reservationId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "예매 내역을 찾을 수 없습니다.")

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN, "예매 취소 권한이 없습니다.")
    }

    if (reservation.status == ReservationStatus.REFUNDED) return null

    if (reservation.status == ReservationStatus.SUCCEEDED) {
      if (!reservation.performance.startsAt.isAfter(LocalDateTime.now())) {
        throw CustomException(ErrorCode.CONFLICT, "공연 시작 후에는 예매를 취소할 수 없습니다.")
      }
      reservation.status = ReservationStatus.CANCELLATION_PENDING
    } else if (reservation.status == ReservationStatus.REFUND_ACCOUNT_REQUIRED) {
      reservation.status = ReservationStatus.CANCELLATION_PENDING
    } else if (reservation.status != ReservationStatus.CANCELLATION_PENDING) {
      throw CustomException(ErrorCode.CONFLICT, "결제 완료된 예매만 취소할 수 있습니다.")
    }

    val paymentKey = reservation.paymentKey
      ?: throw CustomException(ErrorCode.CONFLICT, "결제 정보를 찾을 수 없습니다.")

    return ReservationCancellationAttempt(
      reservationId = reservation.id,
      userId = reservation.booker.id,
      paymentKey = paymentKey,
      orderId = reservation.orderId,
      amount = reservation.amount,
    )
  }

  @Transactional
  fun complete(attempt: ReservationCancellationAttempt): ReservationCancellationResult {
    val reservation = reservationRepository.findByIdForUpdate(attempt.reservationId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "예매 내역을 찾을 수 없습니다.")

    if (reservation.status == ReservationStatus.REFUNDED) {
      return ReservationCancellationResult(reservation.id, reservation.status)
    }

    if (
      reservation.status != ReservationStatus.CANCELLATION_PENDING ||
      reservation.paymentKey != attempt.paymentKey
    ) {
      throw CustomException(ErrorCode.CONFLICT, "예매 취소 상태가 아닙니다.")
    }

    val venueSeatIds = reservationSeatRepository.findVenueSeatIdsByReservationId(reservation.id)
    reservation.status = ReservationStatus.REFUNDED

    if (venueSeatIds.isNotEmpty()) {
      outboxEventService.recordPaymentCancelled(
        reservationId = reservation.id,
        groupId = reservation.groupId,
        performanceId = reservation.performance.id,
        venueSeatIds = venueSeatIds,
      )
    }

    return ReservationCancellationResult(reservation.id, reservation.status)
  }

  @Transactional
  fun requireRefundAccount(attempt: ReservationCancellationAttempt): ReservationCancellationResult {
    val reservation = reservationRepository.findByIdForUpdate(attempt.reservationId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "예매 내역을 찾을 수 없습니다.")

    if (reservation.status == ReservationStatus.REFUNDED) {
      return ReservationCancellationResult(reservation.id, reservation.status)
    }

    if (
      reservation.status !in setOf(ReservationStatus.CANCELLATION_PENDING, ReservationStatus.REFUND_ACCOUNT_REQUIRED) ||
      reservation.paymentKey != attempt.paymentKey
    ) {
      throw CustomException(ErrorCode.CONFLICT, "예매 취소 상태가 아닙니다.")
    }

    reservation.status = ReservationStatus.REFUND_ACCOUNT_REQUIRED
    return ReservationCancellationResult(reservation.id, reservation.status)
  }

  @Transactional(readOnly = true)
  fun findPending(reservationId: Long): ReservationCancellationAttempt? {
    val reservation = reservationRepository.findById(reservationId).orElse(null) ?: return null
    if (reservation.status != ReservationStatus.CANCELLATION_PENDING) return null

    val paymentKey = reservation.paymentKey ?: return null
    return ReservationCancellationAttempt(
      reservationId = reservation.id,
      userId = reservation.booker.id,
      paymentKey = paymentKey,
      orderId = reservation.orderId,
      amount = reservation.amount,
    )
  }
}

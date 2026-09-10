package com.example.server.reservation

import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceSeatStompPublisher
import com.example.server.performance.RedisSeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.dto.CancelCheckoutResult
import com.example.server.reservation.dto.StartCheckoutResult
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.time.Duration
import java.time.LocalDateTime
import java.util.UUID

@Service
class ReservationCheckoutService(
  private val userRepository: UserRepository,
  private val performanceRepository: PerformanceRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val reservationRepository: ReservationRepository,
  private val redisSeatHoldService: RedisSeatHoldService,
  private val performanceSeatStompPublisher: PerformanceSeatStompPublisher,
) {
  @Transactional
  fun startCheckout(userId: Long, holdId: String): StartCheckoutResult {
    val hold = redisSeatHoldService.findActive(holdId)
      ?: throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")

    if (hold.ownerUserId != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    val existingReservation =
      reservationRepository.findByHoldIdForUpdate(holdId)

    if (existingReservation != null) {
      return existingCheckout(
        reservation = existingReservation,
        userId = userId,
      )
    }

    val performance = performanceRepository.findByIdWithConcertAndVenue(hold.performanceId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.")

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(
      venueId = performance.concert.venue.id,
      venueSeatIds = hold.venueSeatIds,
    )

    if (venueSeats.size != hold.venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    val user = userRepository.findById(userId)
      .orElseThrow {
        CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다.")
      }

    val paymentExpiresAt = LocalDateTime.now().plus(PAYMENT_TTL)
    val candidateOrderId = "tikkle-${UUID.randomUUID()}"
    val orderName =
      "${performance.concert.title} ${performance.name} ${venueSeats.size}석"
    val amount = venueSeats.sumOf { it.price }

    reservationRepository.insertPaymentPendingIfAbsent(
      performanceId = performance.id,
      bookerUserId = user.id,
      holdId = holdId,
      orderId = candidateOrderId,
      orderName = orderName,
      amount = amount,
      paymentExpiresAt = paymentExpiresAt,
    )

    val reservation = reservationRepository.findByHoldIdForUpdate(holdId)
      ?: throw IllegalStateException("생성한 결제 대기 예매를 찾을 수 없습니다.")

    if (reservation.orderId != candidateOrderId) {
      return existingCheckout(
        reservation = reservation,
        userId = userId,
      )
    }

    if (redisSeatHoldService.extendForPayment(holdId, paymentExpiresAt) == null) {
      reservation.status = ReservationStatus.EXPIRED
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")
    }

    return StartCheckoutResult.from(reservation)
  }

  @Transactional
  fun cancelCheckout(userId: Long, reservationId: Long): CancelCheckoutResult {
    val reservation =
      reservationRepository.findByIdForUpdate(reservationId)
        ?: throw CustomException(ErrorCode.NOT_FOUND, "결제 대상 예매를 찾을 수 없습니다.")

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    when (reservation.status) {
      ReservationStatus.PAYMENT_CONFIRMING ->
        throw CustomException(ErrorCode.CONFLICT, "결제 승인 결과를 확인하고 있습니다.")

      ReservationStatus.REFUND_REQUIRED ->
        throw CustomException(ErrorCode.CONFLICT, "결제 취소 또는 환불 확인이 필요합니다.")

      ReservationStatus.SUCCEEDED ->
        throw CustomException(ErrorCode.CONFLICT, "이미 종료된 결제입니다.")

      ReservationStatus.FAILED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED,
      ReservationStatus.REFUNDED,
      -> throw CustomException(ErrorCode.CONFLICT, "이미 종료된 결제 요청입니다.")

      ReservationStatus.PAYMENT_PENDING -> Unit
    }

    reservation.status =
      if (reservation.paymentExpiresAt.isAfter(LocalDateTime.now())) {
        ReservationStatus.CANCELLED
      } else {
        ReservationStatus.EXPIRED
      }

    releaseHoldAfterCommit(reservation.holdId) { hold ->
      performanceSeatStompPublisher.publishHoldReleased(
        performanceId = hold.performanceId,
        seatIds = hold.venueSeatIds,
      )
    }

    return CancelCheckoutResult.from(reservation)
  }

  @Transactional
  fun expireCheckout(reservationId: Long) {
    val reservation = reservationRepository.findByIdForUpdate(reservationId)
      ?: return

    if (
      reservation.status != ReservationStatus.PAYMENT_PENDING ||
      reservation.paymentExpiresAt.isAfter(LocalDateTime.now())
    ) {
      return
    }

    reservation.status = ReservationStatus.EXPIRED
    releaseHoldAfterCommit(reservation.holdId) { hold ->
      performanceSeatStompPublisher.publishHoldReleased(
        performanceId = hold.performanceId,
        seatIds = hold.venueSeatIds,
      )
    }
  }

  private fun existingCheckout(reservation: Reservation, userId: Long): StartCheckoutResult {
    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    if (reservation.status != ReservationStatus.PAYMENT_PENDING) {
      throw CustomException(
        ErrorCode.CONFLICT,
        "이미 종료된 예매입니다.",
      )
    }

    return StartCheckoutResult.from(reservation)
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

  companion object {
    private val PAYMENT_TTL = Duration.ofMinutes(5)
  }
}

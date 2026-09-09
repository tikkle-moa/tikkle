package com.example.server.reservation

import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceSeatEventPublisher
import com.example.server.performance.SeatHold
import com.example.server.performance.SeatHoldService
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
  private val seatHoldService: SeatHoldService,
  private val performanceSeatEventPublisher: PerformanceSeatEventPublisher,
) {
  @Transactional
  fun startCheckout(userId: Long, holdId: String): StartCheckoutResult {
    val hold = seatHoldService.findActive(holdId)
      ?: throw CustomException(ErrorCode.HOLD_EXPIRED)

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
      ?: throw IllegalStateException("생성한 결제 대기 예약을 찾을 수 없습니다.")

    if (reservation.orderId != candidateOrderId) {
      return existingCheckout(
        reservation = reservation,
        userId = userId,
      )
    }

    if (seatHoldService.extendForPayment(holdId, paymentExpiresAt) == null) {
      reservation.status = ReservationStatus.EXPIRED
      throw CustomException(ErrorCode.HOLD_EXPIRED)
    }

    return StartCheckoutResult.from(reservation)
  }

  @Transactional
  fun cancelCheckout(userId: Long, reservationId: Long): CancelCheckoutResult {
    val reservation =
      reservationRepository.findByIdForUpdate(reservationId)
        ?: throw CustomException(ErrorCode.PAYMENT_NOT_FOUND)

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    when (reservation.status) {
      ReservationStatus.SUCCEEDED ->
        throw CustomException(ErrorCode.PAYMENT_ALREADY_FINISHED)

      ReservationStatus.FAILED,
      ReservationStatus.CANCELLED,
      ReservationStatus.EXPIRED,
      ->
        throw CustomException(ErrorCode.PAYMENT_ALREADY_CANCELLED)

      ReservationStatus.PAYMENT_PENDING -> Unit
    }

    reservation.status =
      if (reservation.paymentExpiresAt.isAfter(LocalDateTime.now())) {
        ReservationStatus.CANCELLED
      } else {
        ReservationStatus.EXPIRED
      }

    releaseHoldAfterCommit(reservation.holdId) { hold ->
      performanceSeatEventPublisher.publishHoldReleased(
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
      performanceSeatEventPublisher.publishHoldReleased(
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
        "이미 종료된 예약입니다.",
      )
    }

    return StartCheckoutResult.from(reservation)
  }

  private fun releaseHoldAfterCommit(holdId: String, onReleased: (SeatHold) -> Unit) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      seatHoldService.release(holdId)?.let(onReleased)
      return
    }

    TransactionSynchronizationManager.registerSynchronization(
      object : TransactionSynchronization {
        override fun afterCommit() {
          seatHoldService.release(holdId)?.let(onReleased)
        }
      },
    )
  }

  companion object {
    private val PAYMENT_TTL = Duration.ofMinutes(5)
  }
}

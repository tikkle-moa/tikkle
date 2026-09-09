package com.example.server.reservation

import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
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
) {
  @Transactional
  fun startCheckout(userId: Long, holdId: String): StartCheckoutResult {
    val hold = seatHoldService.findActive(holdId)
      ?: throw CustomException(ErrorCode.HOLD_EXPIRED)

    if (hold.ownerUserId != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    val existingReservation = reservationRepository.findByHoldId(holdId)

    if (existingReservation != null) {
      if (existingReservation.booker.id != userId) {
        throw CustomException(ErrorCode.FORBIDDEN)
      }

      if (existingReservation.status != ReservationStatus.PAYMENT_PENDING) {
        throw CustomException(
          ErrorCode.CONFLICT,
          "이미 종료된 예약입니다.",
        )
      }

      return StartCheckoutResult.from(existingReservation)
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

    if (seatHoldService.extendForPayment(holdId, paymentExpiresAt) == null) {
      throw CustomException(ErrorCode.HOLD_EXPIRED)
    }

    val reservation = reservationRepository.save(
      Reservation(
        performance = performance,
        booker = user,
        holdId = holdId,
        orderId = "tikkle-${UUID.randomUUID()}",
        orderName = "${performance.concert.title} ${performance.name} ${venueSeats.size}석",
        amount = venueSeats.sumOf { it.price },
        status = ReservationStatus.PAYMENT_PENDING,
        paymentExpiresAt = paymentExpiresAt,
      ),
    )

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

    releaseHoldAfterCommit(reservation.holdId)

    return CancelCheckoutResult.from(reservation)
  }

  private fun releaseHoldAfterCommit(holdId: String) {
    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      seatHoldService.release(holdId)
      return
    }

    TransactionSynchronizationManager.registerSynchronization(
      object : TransactionSynchronization {
        override fun afterCommit() {
          seatHoldService.release(holdId)
        }
      },
    )
  }

  companion object {
    private val PAYMENT_TTL = Duration.ofMinutes(5)
  }
}

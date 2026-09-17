package com.example.server.reservation

import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.OutboxEventService
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.dto.CancelCheckoutMessageData
import com.example.server.reservation.dto.StartCheckoutMessageData
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.LocalDateTime
import java.util.UUID

@Service
class ReservationCheckoutService(
  private val userRepository: UserRepository,
  private val performanceRepository: PerformanceRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val reservationRepository: ReservationRepository,
  private val redisVenueSeatHoldService: RedisVenueSeatHoldService,
  private val outboxEventService: OutboxEventService,
) {
  @Transactional
  fun startCheckout(userId: Long, performanceId: Long): StartCheckoutMessageData {
    val groupId = redisVenueSeatHoldService.getGroupId(userId, performanceId)
    val activeHoldData = try {
      redisVenueSeatHoldService.findActiveHoldDataByGroupId(groupId)
    } catch (exception: CustomException) {
      if (exception.errorCode == ErrorCode.NOT_FOUND) {
        throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")
      }

      throw exception
    }

    if (
      activeHoldData.performanceId != performanceId ||
      activeHoldData.holdDetails.any { it.groupId != groupId || it.performanceId != performanceId }
    ) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 정보가 공연 회차와 일치하지 않습니다.")
    }

    val venueSeatIds = activeHoldData.holdVenueSeatEntries.map { it.venueSeatId }
    if (venueSeatIds.distinct().size != venueSeatIds.size) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 정보가 올바르지 않습니다.")
    }

    val existingReservation = reservationRepository.findByGroupIdForUpdate(groupId)
    if (existingReservation != null) {
      return existingCheckout(
        reservation = existingReservation,
        groupId = groupId,
      )
    }

    val performance = performanceRepository.findByIdWithConcertAndVenue(performanceId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.")

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(
      venueId = performance.concert.venue.id,
      venueSeatIds = venueSeatIds,
    )

    if (venueSeats.size != venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    val user = userRepository.findById(userId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "사용자를 찾을 수 없습니다.") }

    val paymentExpiresAt = LocalDateTime.now().plus(PAYMENT_TTL)
    val candidateOrderId = "tikkle-${UUID.randomUUID()}"
    val orderName = "${performance.concert.title} ${performance.name} ${venueSeats.size}석"
    val amount = venueSeats.sumOf { it.price }

    reservationRepository.insertPaymentPendingIfAbsent(
      performanceId = performance.id,
      bookerUserId = user.id,
      groupId = groupId,
      orderId = candidateOrderId,
      orderName = orderName,
      amount = amount,
      paymentExpiresAt = paymentExpiresAt,
    )

    val reservation = reservationRepository.findByGroupIdForUpdate(groupId)
      ?: throw IllegalStateException("생성한 결제 대기 예매를 찾을 수 없습니다.")

    if (reservation.orderId != candidateOrderId) {
      return existingCheckout(
        reservation = reservation,
        groupId = groupId,
      )
    }

    try {
      redisVenueSeatHoldService.transitionForPayment(groupId, paymentExpiresAt)
    } catch (exception: CustomException) {
      reservation.status = ReservationStatus.EXPIRED
      if (exception.errorCode == ErrorCode.NOT_FOUND) {
        throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")
      }

      throw exception
    }

    return StartCheckoutMessageData.from(reservation)
  }

  @Transactional
  fun cancelCheckout(userId: Long, reservationId: Long): CancelCheckoutMessageData {
    val reservation = reservationRepository.findByIdForUpdate(reservationId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "결제 대상 예매를 찾을 수 없습니다.")

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN, "예매 취소 권한이 없습니다.")
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

    reservation.status = if (reservation.paymentExpiresAt.isAfter(LocalDateTime.now())) {
      ReservationStatus.CANCELLED
    } else {
      ReservationStatus.EXPIRED
    }

    recordReleasedSeatsEvents(reservation)

    return CancelCheckoutMessageData.from(reservation)
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

    recordReleasedSeatsEvents(reservation)
  }

  private fun existingCheckout(reservation: Reservation, groupId: String): StartCheckoutMessageData {
    if (reservation.groupId != groupId) {
      throw CustomException(ErrorCode.FORBIDDEN, "다른 사용자의 결제 대기 예매입니다.")
    }

    if (reservation.status != ReservationStatus.PAYMENT_PENDING) {
      throw CustomException(ErrorCode.CONFLICT, "이미 종료된 예매입니다.")
    }

    return StartCheckoutMessageData.from(reservation)
  }

  private fun recordReleasedSeatsEvents(reservation: Reservation) {
    val activeHoldData = try {
      redisVenueSeatHoldService.findActiveHoldDataByGroupId(reservation.groupId)
    } catch (exception: CustomException) {
      if (exception.errorCode == ErrorCode.NOT_FOUND) return
      throw exception
    }

    activeHoldData.holdDetails.forEach { hold ->
      outboxEventService.recordReleasedSeats(
        reservationId = reservation.id,
        hold = hold,
      )
    }
  }

  companion object {
    private val PAYMENT_TTL = Duration.ofMinutes(5)
  }
}

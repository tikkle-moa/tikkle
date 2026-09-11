package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.RedisSeatHoldService
import com.example.server.reservation.dto.PaymentOrderResult
import com.example.server.reservation.dto.PaymentOrderSeatResult
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class ReservationPaymentOrderService(
  private val reservationRepository: ReservationRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val redisSeatHoldService: RedisSeatHoldService,
) {
  @Transactional(readOnly = true)
  fun getPaymentOrder(userId: Long, reservationId: Long): PaymentOrderResult {
    val reservation = reservationRepository.findPaymentOrderById(reservationId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "결제 대상 예매를 찾을 수 없습니다.")

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN)
    }

    if (
      reservation.status != ReservationStatus.PAYMENT_PENDING ||
      !reservation.paymentExpiresAt.isAfter(LocalDateTime.now())
    ) {
      throw CustomException(ErrorCode.CONFLICT, "결제 가능 시간이 만료되었습니다.")
    }

    val hold = redisSeatHoldService.findActive(reservation.holdId)
      ?: throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")

    if (hold.ownerUserId != userId || hold.performanceId != reservation.performance.id) {
      throw CustomException(ErrorCode.CONFLICT, "결제 정보를 확인할 수 없습니다.")
    }

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(
      venueId = reservation.performance.concert.venue.id,
      venueSeatIds = hold.venueSeatIds,
    ).associateBy { it.id }

    if (venueSeats.size != hold.venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    return PaymentOrderResult(
      reservationId = reservation.id,
      orderId = reservation.orderId,
      orderName = reservation.orderName,
      amount = reservation.amount,
      paymentExpiresAt = reservation.paymentExpiresAt,
      concertTitle = reservation.performance.concert.title,
      performanceName = reservation.performance.name,
      performanceStartsAt = reservation.performance.startsAt,
      venueName = reservation.performance.concert.venue.name,
      seats = hold.venueSeatIds.map { venueSeatId ->
        val seat = checkNotNull(venueSeats[venueSeatId])

        PaymentOrderSeatResult(
          venueSeatId = seat.id,
          sectionName = seat.sectionName,
          seatLabel = seat.seatLabel,
          price = seat.price,
        )
      },
    )
  }
}

package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.reservation.dto.MyReservationResponse
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ReservationService(
  private val reservationRepository: ReservationRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
) {
  @Transactional(readOnly = true)
  fun getMyReservations(userId: Long): List<MyReservationResponse> {
    val reservations = reservationRepository.findAllByBookerIdOrderByCreatedAtDesc(userId)
    if (reservations.isEmpty()) return emptyList()

    val seatsByReservationId = reservationSeatRepository
      .findAllDetailsByReservationIds(reservations.map { it.id })
      .groupBy { it.reservation.id }

    return reservations.map { reservation ->
      MyReservationResponse.from(reservation, seatsByReservationId[reservation.id].orEmpty())
    }
  }

  @Transactional(readOnly = true)
  fun getMyReservation(userId: Long, reservationId: Long): MyReservationResponse {
    val reservation = reservationRepository.findReservationDetailsById(reservationId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "예매 내역을 찾을 수 없습니다.")

    if (reservation.booker.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN, "예매 내역을 조회할 권한이 없습니다.")
    }

    val seats = reservationSeatRepository.findAllDetailsByReservationIds(listOf(reservation.id))
    return MyReservationResponse.from(reservation, seats)
  }
}

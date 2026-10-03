package com.example.server.reservation.dto

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.types.ReservationStatus
import java.time.LocalDateTime

data class MyReservationResponse(
  val id: Long,
  val concertTitle: String,
  val posterUrl: String?,
  val performanceName: String,
  val performanceStartsAt: LocalDateTime,
  val venueName: String,
  val venueId: Long,
  val seats: List<ReservationSeatResponse>,
  val amount: Int,
  val status: ReservationStatus,
  val createdAt: LocalDateTime,
) {
  companion object {
    fun from(reservation: Reservation, reservationSeats: List<ReservationSeat>) = MyReservationResponse(
      id = reservation.id,
      concertTitle = reservation.performance.concert.title,
      posterUrl = reservation.performance.concert.posterUrl,
      performanceName = reservation.performance.name,
      performanceStartsAt = reservation.performance.startsAt,
      venueName = reservation.performance.concert.venue.name,
      venueId = reservation.performance.concert.venue.id,
      seats = reservationSeats.map {
        ReservationSeatResponse(
          sectionName = it.venueSeat.sectionName,
          seatLabel = it.venueSeat.seatLabel,
        )
      },
      amount = reservation.amount,
      status = reservation.status,
      createdAt = reservation.createdAt,
    )
  }
}

data class ReservationSeatResponse(val sectionName: String, val seatLabel: String)

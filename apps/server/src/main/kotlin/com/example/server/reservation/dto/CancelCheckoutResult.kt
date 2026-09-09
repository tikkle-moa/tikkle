package com.example.server.reservation.dto

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus

data class CancelCheckoutResult(val reservationId: Long, val status: ReservationStatus) {
  companion object {
    fun from(reservation: Reservation) = CancelCheckoutResult(
      reservationId = reservation.id,
      status = reservation.status,
    )
  }
}

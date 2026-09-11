package com.example.server.reservation.payment.dto

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus

data class ConfirmPaymentResult(val reservationId: Long, val status: ReservationStatus) {
  companion object {
    fun from(reservation: Reservation) = ConfirmPaymentResult(
      reservationId = reservation.id,
      status = reservation.status,
    )
  }
}

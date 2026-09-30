package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus
import java.util.UUID

data class CancelCheckoutMessage(override val requestId: UUID, override val data: CancelCheckoutMessageData) :
  StompSuccessMessage<CancelCheckoutMessageData>

data class CancelCheckoutMessageData(val reservationId: Long, val status: ReservationStatus) {
  companion object {
    fun from(reservation: Reservation) = CancelCheckoutMessageData(
      reservationId = reservation.id,
      status = reservation.status,
    )
  }
}

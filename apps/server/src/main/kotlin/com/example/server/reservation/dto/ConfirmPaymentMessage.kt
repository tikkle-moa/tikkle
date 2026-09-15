package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus
import java.util.UUID

data class ConfirmPaymentMessage(override val requestId: UUID, override val data: ConfirmPaymentMessageData) :
  StompSuccessMessage<ConfirmPaymentMessageData>

data class ConfirmPaymentMessageData(val reservationId: Long, val status: ReservationStatus) {
  companion object {
    fun from(reservation: Reservation) = ConfirmPaymentMessageData(
      reservationId = reservation.id,
      status = reservation.status,
    )
  }
}

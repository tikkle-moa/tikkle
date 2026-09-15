package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import com.example.server.reservation.entity.Reservation
import java.time.LocalDateTime
import java.util.UUID

data class StartCheckoutMessage(override val requestId: UUID, override val data: StartCheckoutMessageData) :
  StompSuccessMessage<StartCheckoutMessageData>

data class StartCheckoutMessageData(
  val reservationId: Long,
  val orderId: String,
  val orderName: String,
  val amount: Int,
  val paymentExpiresAt: LocalDateTime,
) {
  companion object {
    fun from(reservation: Reservation): StartCheckoutMessageData = StartCheckoutMessageData(
      reservationId = reservation.id,
      orderId = reservation.orderId,
      orderName = reservation.orderName,
      amount = reservation.amount,
      paymentExpiresAt = reservation.paymentExpiresAt,
    )
  }
}

package com.example.server.reservation.dto

import com.example.server.reservation.entity.Reservation
import java.time.LocalDateTime

data class StartCheckoutResult(
  val reservationId: Long,
  val orderId: String,
  val orderName: String,
  val amount: Int,
  val paymentExpiresAt: LocalDateTime,
) {
  companion object {
    fun from(reservation: Reservation): StartCheckoutResult = StartCheckoutResult(
      reservationId = reservation.id,
      orderId = reservation.orderId,
      orderName = reservation.orderName,
      amount = reservation.amount,
      paymentExpiresAt = reservation.paymentExpiresAt,
    )
  }
}

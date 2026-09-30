package com.example.server.reservation.payment.dto

import com.example.server.reservation.types.ReservationStatus

data class PaymentReconciliationTarget(
  val reservationId: Long,
  val status: ReservationStatus,
  val paymentKey: String,
  val orderId: String,
  val amount: Int,
)

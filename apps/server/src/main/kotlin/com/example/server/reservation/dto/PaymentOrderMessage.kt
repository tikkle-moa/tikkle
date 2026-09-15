package com.example.server.reservation.dto

import java.time.LocalDateTime

data class PaymentOrderMessage(
  val reservationId: Long,
  val orderId: String,
  val orderName: String,
  val amount: Int,
  val paymentExpiresAt: LocalDateTime,
  val concertTitle: String,
  val posterUrl: String?,
  val performanceName: String,
  val performanceStartsAt: LocalDateTime,
  val venueName: String,
  val seats: List<PaymentOrderSeatMessage>,
)

data class PaymentOrderSeatMessage(val venueSeatId: Long, val sectionName: String, val seatLabel: String, val price: Int)

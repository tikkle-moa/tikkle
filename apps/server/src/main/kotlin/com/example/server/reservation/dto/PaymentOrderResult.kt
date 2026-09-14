package com.example.server.reservation.dto

import java.time.LocalDateTime

data class PaymentOrderResult(
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
  val seats: List<PaymentOrderSeatResult>,
)

data class PaymentOrderSeatResult(val venueSeatId: Long, val sectionName: String, val seatLabel: String, val price: Int)

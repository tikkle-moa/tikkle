package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.time.LocalDateTime
import java.util.UUID

data class PaymentOrderMessage(override val requestId: UUID, override val data: PaymentOrderMessageData) :
  StompSuccessMessage<PaymentOrderMessageData>

data class PaymentOrderMessageData(
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
  val seats: List<PaymentOrderSeatData>,
)

data class PaymentOrderSeatData(val venueSeatId: Long, val sectionName: String, val seatLabel: String, val price: Int)

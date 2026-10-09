package com.example.server.outbox.dto

data class PaymentCancelledSeatEventPayload(
  val reservationId: Long,
  val scopeId: String,
  val performanceId: Long,
  val seatIds: List<Long>,
  val cancelledAtEpochMillis: Long,
)

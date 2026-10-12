package com.example.server.outbox.dto

data class ReservationSeatEventPayload(
  val reservationId: Long,
  val holdId: String,
  val scopeId: String,
  val performanceId: Long,
  val seatIds: List<Long>,
)

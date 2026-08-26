package com.example.server.performance.dto

import java.math.BigDecimal
import java.time.LocalDateTime

data class SeatResponse(
  val id: Long,
  val performanceId: Long,
  val sectionName: String,
  val seatNumber: Int,
  val seatLabel: String,
  val price: Int,
  val positionX: BigDecimal,
  val positionY: BigDecimal,
  val createdAt: LocalDateTime,
)

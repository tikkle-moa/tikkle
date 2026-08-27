package com.example.server.performance.dto

import com.example.server.performance.entity.Seat
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
  val booked: Boolean,
) {
  companion object {
    fun from(seat: Seat, booked: Boolean = false): SeatResponse = SeatResponse(
      id = seat.id,
      performanceId = seat.performance.id,
      sectionName = seat.sectionName,
      seatNumber = seat.seatNumber,
      seatLabel = seat.seatLabel,
      price = seat.price,
      positionX = seat.positionX,
      positionY = seat.positionY,
      createdAt = seat.createdAt,
      booked = booked,
    )
  }
}

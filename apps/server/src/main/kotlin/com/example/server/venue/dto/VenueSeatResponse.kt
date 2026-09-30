package com.example.server.venue.dto

import com.example.server.venue.entity.VenueSeat
import java.math.BigDecimal
import java.time.LocalDateTime

data class VenueSeatResponse(
  val id: Long,
  val venueId: Long,
  val sectionName: String,
  val seatNumber: Int,
  val seatLabel: String,
  val price: Int,
  val positionX: BigDecimal,
  val positionY: BigDecimal,
  val createdAt: LocalDateTime,
) {
  companion object {
    fun from(seat: VenueSeat): VenueSeatResponse = VenueSeatResponse(
      id = seat.id,
      venueId = seat.venue.id,
      sectionName = seat.sectionName,
      seatNumber = seat.seatNumber,
      seatLabel = seat.seatLabel,
      price = seat.price,
      positionX = seat.positionX,
      positionY = seat.positionY,
      createdAt = seat.createdAt,
    )
  }
}

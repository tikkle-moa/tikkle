package com.example.server.venue.dto

import com.example.server.venue.entity.Venue
import java.math.BigDecimal
import java.time.LocalDateTime

data class VenueListResponse(
  val id: Long,
  val name: String,
  val address: String,
  val width: BigDecimal,
  val height: BigDecimal,
  val createdAt: LocalDateTime,
  val venueSeatCount: Long,
  val concertCount: Long,
) {
  companion object {
    fun from(venue: Venue, venueSeatCount: Long, concertCount: Long): VenueListResponse = VenueListResponse(
      id = venue.id,
      name = venue.name,
      address = venue.address,
      width = venue.width,
      height = venue.height,
      createdAt = venue.createdAt,
      venueSeatCount = venueSeatCount,
      concertCount = concertCount,
    )
  }
}

package com.example.server.venue.dto

import com.example.server.venue.entity.Venue
import java.math.BigDecimal
import java.time.LocalDateTime

data class VenueResponse(
  val id: Long,
  val name: String,
  val address: String,
  val description: String?,
  val width: BigDecimal,
  val height: BigDecimal,
  val stagePositionX: BigDecimal,
  val stagePositionY: BigDecimal,
  val stageWidth: BigDecimal,
  val stageHeight: BigDecimal,
  val createdAt: LocalDateTime,
  val venueSeatCount: Long,
  val concertCount: Long,
) {
  companion object {
    fun from(venue: Venue, venueSeatCount: Long, concertCount: Long): VenueResponse = VenueResponse(
      id = venue.id,
      name = venue.name,
      address = venue.address,
      description = venue.description,
      width = venue.width,
      height = venue.height,
      stagePositionX = venue.stagePositionX,
      stagePositionY = venue.stagePositionY,
      stageWidth = venue.stageWidth,
      stageHeight = venue.stageHeight,
      createdAt = venue.createdAt,
      venueSeatCount = venueSeatCount,
      concertCount = concertCount,
    )
  }
}

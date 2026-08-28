package com.example.server.concert.dto

import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import java.time.LocalDateTime

data class ConcertListResponse(
  val id: Long,
  val venueId: Long,
  val title: String,
  val genre: ConcertGenre,
  val venueName: String,
  val posterUrl: String?,
  val createdAt: LocalDateTime,
) {
  companion object {
    fun from(concert: Concert): ConcertListResponse = ConcertListResponse(
      id = concert.id,
      venueId = concert.venue.id,
      title = concert.title,
      genre = concert.genre,
      venueName = concert.venue.name,
      posterUrl = concert.posterUrl,
      createdAt = concert.createdAt,
    )
  }
}

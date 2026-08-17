package com.example.server.concert.dto

import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import java.time.LocalDateTime

data class ConcertResponse(
  val id: Long,
  val title: String,
  val genre: ConcertGenre,
  val placeName: String,
  val posterUrl: String?,
  val description: String?,
  val createdAt: LocalDateTime,
) {
  companion object {
    fun from(concert: Concert): ConcertResponse = ConcertResponse(
      id = concert.id,
      title = concert.title,
      genre = concert.genre,
      placeName = concert.placeName,
      posterUrl = concert.posterUrl,
      description = concert.description,
      createdAt = concert.createdAt,
    )
  }
}

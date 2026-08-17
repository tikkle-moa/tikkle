package com.example.server.concert.dto

import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import java.time.LocalDateTime

data class ConcertListResponse(
  val id: Long,
  val title: String,
  val genre: ConcertGenre,
  val placeName: String,
  val posterUrl: String?,
  val createdAt: LocalDateTime,
) {
  companion object {
    fun from(concert: Concert): ConcertListResponse = ConcertListResponse(
      id = concert.id,
      title = concert.title,
      genre = concert.genre,
      placeName = concert.placeName,
      posterUrl = concert.posterUrl,
      createdAt = concert.createdAt,
    )
  }
}

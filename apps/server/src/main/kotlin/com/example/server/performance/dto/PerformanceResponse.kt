package com.example.server.performance.dto

import com.example.server.performance.entity.Performance
import com.example.server.performance.types.PerformanceStatus
import java.time.LocalDateTime

data class PerformanceResponse(
  val id: Long,
  val concertId: Long,
  val venueId: Long,
  val name: String,
  val startsAt: LocalDateTime,
  val bookingOpensAt: LocalDateTime?,
  val createdAt: LocalDateTime,
  val status: PerformanceStatus,
) {
  companion object {
    fun from(performance: Performance, isSoldOut: Boolean = false): PerformanceResponse = PerformanceResponse(
      id = performance.id,
      concertId = performance.concert.id,
      venueId = performance.concert.venue.id,
      name = performance.name,
      startsAt = performance.startsAt,
      bookingOpensAt = performance.bookingOpensAt,
      createdAt = performance.createdAt,
      status = PerformanceStatus.from(performance, isSoldOut),
    )
  }
}

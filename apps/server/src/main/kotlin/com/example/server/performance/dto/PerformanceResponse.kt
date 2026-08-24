package com.example.server.performance.dto

import com.example.server.performance.entity.Performance
import java.time.LocalDateTime

data class PerformanceResponse(
  val id: Long,
  val concertId: Long,
  val startsAt: LocalDateTime,
  val bookingOpensAt: LocalDateTime?,
  val createdAt: LocalDateTime,
) {
  companion object {
    fun from(performance: Performance): PerformanceResponse = PerformanceResponse(
      id = performance.id,
      concertId = performance.concert.id,
      startsAt = performance.startsAt,
      bookingOpensAt = performance.bookingOpensAt,
      createdAt = performance.createdAt,
    )
  }
}

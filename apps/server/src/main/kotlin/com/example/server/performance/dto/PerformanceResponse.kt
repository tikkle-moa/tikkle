package com.example.server.performance.dto

import java.time.LocalDateTime

data class PerformanceResponse(
  val id: Long,
  val concertId: Long,
  val startsAt: LocalDateTime,
  val bookingOpensAt: LocalDateTime?,
  val createdAt: LocalDateTime,
)

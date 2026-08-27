package com.example.server.performance.types

import com.example.server.performance.entity.Performance
import java.time.LocalDateTime

enum class PerformanceStatus {
  UPCOMING,
  AVAILABLE,
  SOLD_OUT,
  ENDED,

  ;

  companion object {
    fun from(performance: Performance, isSoldOut: Boolean = false): PerformanceStatus {
      val now = LocalDateTime.now()
      return when {
        !now.isBefore(performance.startsAt) -> ENDED
        isSoldOut -> SOLD_OUT
        performance.bookingOpensAt != null && now.isBefore(performance.bookingOpensAt) -> UPCOMING
        else -> AVAILABLE
      }
    }
  }
}

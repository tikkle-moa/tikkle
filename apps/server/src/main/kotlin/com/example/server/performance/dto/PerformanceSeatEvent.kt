package com.example.server.performance.dto

enum class PerformanceSeatEvent {
  HOLD_RELEASED,
}

data class HoldReleasedEventData(val seatIds: List<Long>)

package com.example.server.performance.stomp.dto

enum class PerformanceSeatEvent {
  HOLD_RELEASED,
}

data class HoldReleasedEventData(val seatIds: List<Long>)

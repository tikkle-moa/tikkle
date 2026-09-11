package com.example.server.performance.dto

enum class PerformanceSeatEvent {
  HOLD_RELEASED,
  RESERVATION_CONFIRMED,
}

data class HoldReleasedEventData(val seatIds: List<Long>)

data class ReservationConfirmedEventData(val seatIds: List<Long>)

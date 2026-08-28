package com.example.server.performance.dto

import java.time.LocalDateTime

data class PerformanceSeatListResponse(val serverTime: LocalDateTime, val bookedSeats: List<Long>, val heldSeats: List<HeldSeat>) {
  companion object {
    fun from(serverTime: LocalDateTime, bookedSeats: List<Long>, heldSeats: List<HeldSeat>): PerformanceSeatListResponse =
      PerformanceSeatListResponse(
        serverTime = serverTime,
        bookedSeats = bookedSeats,
        heldSeats = heldSeats,
      )
  }
}

data class HeldSeat(val id: Long, val expiresAt: LocalDateTime)

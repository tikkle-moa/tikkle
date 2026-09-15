package com.example.server.performance.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.time.LocalDateTime
import java.util.UUID

data class PerformanceSeatStatusMessage(override val requestId: UUID, override val data: PerformanceSeatStatusMessageData) :
  StompSuccessMessage<PerformanceSeatStatusMessageData>

data class PerformanceSeatStatusMessageData(val serverTime: LocalDateTime, val bookedSeats: List<Long>, val heldSeats: List<HeldSeat>) {
  companion object {
    fun from(serverTime: LocalDateTime, bookedSeats: List<Long>, heldSeats: List<HeldSeat>): PerformanceSeatStatusMessageData =
      PerformanceSeatStatusMessageData(
        serverTime = serverTime,
        bookedSeats = bookedSeats,
        heldSeats = heldSeats,
      )
  }
}

data class HeldSeat(val id: Long, val expiresAt: LocalDateTime)

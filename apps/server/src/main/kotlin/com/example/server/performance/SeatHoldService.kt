package com.example.server.performance

import java.time.LocalDateTime

interface SeatHoldService {
  fun create(performanceId: Long, ownerUserId: Long, venueSeatIds: List<Long>): SeatHold

  fun findActive(holdId: String): SeatHold?

  fun extendForPayment(holdId: String, paymentExpiresAt: LocalDateTime): SeatHold?

  fun release(holdId: String): SeatHold?
}

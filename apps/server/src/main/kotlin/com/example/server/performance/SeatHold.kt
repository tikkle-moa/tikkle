package com.example.server.performance

import java.time.LocalDateTime

data class SeatHold(val holdId: String, val ownerUserId: Long, val performanceId: Long, val venueSeatIds: List<Long>, val expiresAt: LocalDateTime)

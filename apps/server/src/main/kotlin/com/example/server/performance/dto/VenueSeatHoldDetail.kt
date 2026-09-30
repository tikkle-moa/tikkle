package com.example.server.performance.dto

import java.time.LocalDateTime

data class VenueSeatHoldDetail(
  val holdId: String,
  val groupId: String,
  val performanceId: Long,
  val venueSeatIds: List<Long>,
  val expiresAt: LocalDateTime,
)

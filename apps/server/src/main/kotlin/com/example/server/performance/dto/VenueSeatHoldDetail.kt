package com.example.server.performance.dto

import java.time.LocalDateTime
import java.util.UUID

data class VenueSeatHoldDetail(
  val holdId: String,
  val scopeId: String,
  val performanceId: Long,
  val venueSeatIds: List<Long>,
  val expiresAt: LocalDateTime,
  val phase: VenueSeatHoldPhase = VenueSeatHoldPhase.HOLDING,
  val reviewToken: UUID? = null,
  val reservationId: Long? = null,
) {
  enum class VenueSeatHoldPhase {
    HOLDING,
    REVIEW,
    PAYMENT,
    SUPERSEDED,
  }
}

fun VenueSeatHoldDetail.toSummary(): VenueSeatHoldSummary = VenueSeatHoldSummary(
  holdId = holdId,
  venueSeatIds = venueSeatIds,
  expiresAt = expiresAt,
)

data class VenueSeatHoldSummary(val holdId: String, val venueSeatIds: List<Long>, val expiresAt: LocalDateTime)

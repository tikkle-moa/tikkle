package com.example.server.performance.dto

import com.example.server.global.stomp.StompEvent
import io.swagger.v3.oas.annotations.media.Schema
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

data class PerformanceSeatEvent(
  override val eventId: UUID,
  override val version: Long,
  override val occurredAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
  override val type: PerformanceSeatEventType,
  override val data: PerformanceSeatEventData,
) : StompEvent<PerformanceSeatEventType, PerformanceSeatEventData>

enum class PerformanceSeatEventType {
  HELD_SEATS,
  RELEASED_SEATS,
  RESERVATION_CONFIRMED,
}

sealed interface PerformanceSeatEventData

data class PerformanceVenueSeatIdsEventData(
  @field:Schema(requiredMode = Schema.RequiredMode.REQUIRED)
  val venueSeatIds: List<Long>,
) : PerformanceSeatEventData

data class PerformanceHeldSeatsEventData(
  @field:Schema(requiredMode = Schema.RequiredMode.REQUIRED)
  val heldSeats: List<HeldSeat>,
) : PerformanceSeatEventData {
  data class HeldSeat(val id: Long, val expiresAt: LocalDateTime)
}

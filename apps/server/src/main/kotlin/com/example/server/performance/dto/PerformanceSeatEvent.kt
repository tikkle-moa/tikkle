package com.example.server.performance.dto

import com.example.server.global.stomp.StompEvent
import io.swagger.v3.oas.annotations.media.Schema
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Schema(oneOf = [PerformanceHeldSeatsEvent::class, PerformanceVenueSeatIdsEvent::class], discriminatorProperty = "type")
sealed interface PerformanceSeatEvent

data class PerformanceHeldSeatsEvent(
  override val eventId: UUID,
  override val version: Long,
  override val occurredAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
  override val type: PerformanceHeldSeatsEventType = PerformanceHeldSeatsEventType.HELD_SEATS,
  override val data: List<HeldSeat>,
) : PerformanceSeatEvent,
  StompEvent<PerformanceHeldSeatsEventType, List<PerformanceHeldSeatsEvent.HeldSeat>> {
  data class HeldSeat(val id: Long, val expiresAt: LocalDateTime)
}

data class PerformanceVenueSeatIdsEvent(
  override val eventId: UUID,
  override val version: Long,
  override val occurredAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
  override val type: PerformanceVenueSeatIdsEventType,
  override val data: List<Long>,
) : PerformanceSeatEvent,
  StompEvent<PerformanceVenueSeatIdsEventType, List<Long>>

enum class PerformanceHeldSeatsEventType {
  HELD_SEATS,
}

enum class PerformanceVenueSeatIdsEventType {
  RELEASED_SEATS,
  RESERVATION_CONFIRMED,
}

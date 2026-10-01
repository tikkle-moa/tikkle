package com.example.server.reservation.dto

import com.example.server.global.stomp.StompEvent
import com.example.server.reservation.types.ReservationStatus
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

data class ReservationStatusChangedEvent(
  override val eventId: UUID,
  override val occurredAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
  override val version: Long = occurredAt.toInstant().toEpochMilli(),
  override val type: ReservationStatusChangedEventType = ReservationStatusChangedEventType.STATUS_CHANGED,
  override val data: ReservationStatusChangedEventData,
) : StompEvent<ReservationStatusChangedEventType, ReservationStatusChangedEventData>

data class ReservationStatusChangedEventData(val reservationId: Long, val status: ReservationStatus)

enum class ReservationStatusChangedEventType {
  STATUS_CHANGED,
}

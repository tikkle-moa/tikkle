package com.example.server.global.stomp

import java.time.OffsetDateTime
import java.util.UUID

interface StompEvent<TType, TData> {
  val eventId: UUID
  val version: Long
  val occurredAt: OffsetDateTime
  val type: TType
  val data: TData
}

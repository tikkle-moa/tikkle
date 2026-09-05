package com.example.server.global.stomp.dto

import java.time.OffsetDateTime
import java.util.UUID

data class StompEvent<T>(val eventId: UUID, val version: Long, val occurredAt: OffsetDateTime, val type: String, val data: T)

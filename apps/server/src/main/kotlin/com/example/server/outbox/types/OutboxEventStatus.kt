package com.example.server.outbox.types

enum class OutboxEventStatus {
  PENDING,
  PROCESSING,
  PUBLISHED,
  DEAD,
}

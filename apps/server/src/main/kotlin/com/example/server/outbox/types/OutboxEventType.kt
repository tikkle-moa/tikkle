package com.example.server.outbox.types

enum class OutboxEventType {
  RELEASED_SEATS,
  PAYMENT_CONFIRMED,
  PAYMENT_CANCELLED,
}

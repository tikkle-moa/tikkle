package com.example.server.outbox.types

enum class OutboxHoldActionResult {
  APPLIED,
  ALREADY_APPLIED,
  EXPIRED,
  REPLACED,
}

package com.example.server.performance.types

enum class OutboxHoldActionResult {
  APPLIED,
  ALREADY_APPLIED,
  EXPIRED,
  REPLACED,
}

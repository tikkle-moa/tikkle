package com.example.server.performance

enum class OutboxHoldActionResult {
  APPLIED,
  ALREADY_APPLIED,
  EXPIRED,
  REPLACED,
}

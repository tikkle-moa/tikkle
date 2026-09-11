package com.example.server.reservation.types

enum class ExternalPaymentStatus {
  READY,
  IN_PROGRESS,
  WAITING_FOR_DEPOSIT,
  DONE,
  CANCELED,
  PARTIAL_CANCELED,
  ABORTED,
  EXPIRED,
}

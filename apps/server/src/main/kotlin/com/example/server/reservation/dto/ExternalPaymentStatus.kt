package com.example.server.reservation.dto

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

package com.example.server.reservation.types

enum class ReservationStatus {
  PAYMENT_PENDING,
  PAYMENT_CONFIRMING,
  SUCCEEDED,
  FAILED,
  CANCELLED,
  EXPIRED,
  REFUND_REQUIRED,
  REFUNDED,
}

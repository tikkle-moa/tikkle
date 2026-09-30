package com.example.server.reservation.types

enum class ReservationStatus {
  PAYMENT_PENDING,
  PAYMENT_CONFIRMING,
  CANCELLATION_PENDING,
  SUCCEEDED,
  FAILED,
  CANCELLED,
  EXPIRED,
  REFUND_REQUIRED,
  REFUNDED,
  ;

  companion object {
    val BOOKED_SEAT_STATUSES = listOf(SUCCEEDED, CANCELLATION_PENDING)
  }
}

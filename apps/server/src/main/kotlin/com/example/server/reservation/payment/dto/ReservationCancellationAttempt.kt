package com.example.server.reservation.payment.dto

data class ReservationCancellationAttempt(val reservationId: Long, val paymentKey: String, val orderId: String, val amount: Int)

package com.example.server.reservation.payment.dto

sealed interface PaymentConfirmationStart {
  data class Ready(val attempt: PaymentConfirmationAttempt) : PaymentConfirmationStart

  data class AlreadySucceeded(val result: ConfirmPaymentResult) : PaymentConfirmationStart
}

data class PaymentConfirmationAttempt(val reservationId: Long, val paymentKey: String)

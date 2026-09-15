package com.example.server.reservation.payment.dto

import com.example.server.reservation.dto.ConfirmPaymentMessage

sealed interface PaymentConfirmationStart {
  data class Ready(val attempt: PaymentConfirmationAttempt) : PaymentConfirmationStart

  data class AlreadySucceeded(val result: ConfirmPaymentMessage) : PaymentConfirmationStart
}

data class PaymentConfirmationAttempt(val reservationId: Long, val paymentKey: String)

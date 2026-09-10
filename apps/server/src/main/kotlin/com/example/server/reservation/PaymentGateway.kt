package com.example.server.reservation

import com.example.server.reservation.dto.ExternalPayment

interface PaymentGateway {
  fun confirm(paymentKey: String, orderId: String, amount: Int): ExternalPayment

  fun cancel(paymentKey: String, cancelReason: String, idempotencyKey: String)

  fun find(paymentKey: String): ExternalPayment?
}

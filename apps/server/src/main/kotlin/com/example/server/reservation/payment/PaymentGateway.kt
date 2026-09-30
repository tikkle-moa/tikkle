package com.example.server.reservation.payment

import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.dto.RefundReceiveAccount

interface PaymentGateway {
  fun confirm(paymentKey: String, orderId: String, amount: Int): ExternalPayment

  fun cancel(paymentKey: String, cancelReason: String, idempotencyKey: String, refundReceiveAccount: RefundReceiveAccount? = null)

  fun find(paymentKey: String): ExternalPayment?
}

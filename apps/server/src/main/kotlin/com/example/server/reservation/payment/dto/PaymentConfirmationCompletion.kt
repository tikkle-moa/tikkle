package com.example.server.reservation.payment.dto

sealed interface PaymentConfirmationCompletion {
  data class Succeeded(val result: ConfirmPaymentResult, val holds: ActiveHoldsSnapshot?) : PaymentConfirmationCompletion

  data class RefundRequired(val holds: ActiveHoldsSnapshot?) : PaymentConfirmationCompletion
}

data class ActiveHoldsSnapshot(val groupId: String, val performanceId: Long, val venueSeatIds: List<Long>)

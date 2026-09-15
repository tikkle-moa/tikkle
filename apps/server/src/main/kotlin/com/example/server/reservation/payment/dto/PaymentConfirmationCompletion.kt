package com.example.server.reservation.payment.dto

import com.example.server.reservation.dto.ConfirmPaymentMessageData

sealed interface PaymentConfirmationCompletion {
  data class Succeeded(val result: ConfirmPaymentMessageData, val holds: ActiveHoldsSnapshot?) : PaymentConfirmationCompletion

  data class RefundRequired(val holds: ActiveHoldsSnapshot?) : PaymentConfirmationCompletion
}

data class ActiveHoldsSnapshot(val groupId: String, val performanceId: Long, val venueSeatIds: List<Long>)

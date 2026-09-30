package com.example.server.reservation.payment.dto

import com.example.server.reservation.payment.types.ExternalPaymentStatus

data class ExternalPayment(val paymentKey: String, val orderId: String, val amount: Int, val status: ExternalPaymentStatus)

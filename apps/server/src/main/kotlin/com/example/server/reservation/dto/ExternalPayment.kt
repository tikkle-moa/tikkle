package com.example.server.reservation.dto

data class ExternalPayment(val paymentKey: String, val orderId: String, val amount: Int, val status: ExternalPaymentStatus)

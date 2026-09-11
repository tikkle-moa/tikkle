package com.example.server.reservation.dto

import com.example.server.reservation.types.ExternalPaymentStatus

data class ExternalPayment(val paymentKey: String, val orderId: String, val amount: Int, val status: ExternalPaymentStatus)

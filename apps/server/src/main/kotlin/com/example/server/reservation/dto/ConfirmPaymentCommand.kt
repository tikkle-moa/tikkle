package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class ConfirmPaymentCommand(override val requestId: UUID, override val data: ConfirmPaymentData) : StompCommand<ConfirmPaymentData>

data class ConfirmPaymentData(val paymentKey: String, val orderId: String, val amount: Int)

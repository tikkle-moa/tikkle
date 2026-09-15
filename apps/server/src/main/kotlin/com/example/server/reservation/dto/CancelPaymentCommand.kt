package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class CancelPaymentCommand(override val requestId: UUID, override val data: CancelPaymentData) : StompCommand<CancelPaymentData>

data class CancelPaymentData(val reservationId: Long)

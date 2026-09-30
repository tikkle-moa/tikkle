package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class GetPaymentOrderCommand(override val requestId: UUID, override val data: GetPaymentOrderData) : StompCommand<GetPaymentOrderData>

data class GetPaymentOrderData(val reservationId: Long)

package com.example.server.reservation.dto

import com.example.server.reservation.payment.dto.RefundReceiveAccount
import jakarta.validation.Valid
import java.util.UUID

data class CancelReservationRequest(val requestId: UUID, @field:Valid val refundReceiveAccount: RefundReceiveAccount? = null)

package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import com.example.server.reservation.payment.dto.RefundReceiveAccount
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import java.util.UUID

data class ReservationCancellationCommand(override val requestId: UUID, override val data: ReservationCancellationData) :
  StompCommand<ReservationCancellationData>

data class ReservationCancellationData(
  @field:Positive val reservationId: Long,
  @field:Schema(requiredMode = Schema.RequiredMode.NOT_REQUIRED)
  @field:Valid val refundReceiveAccount: RefundReceiveAccount? = null,
)

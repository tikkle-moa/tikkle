package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import com.example.server.reservation.types.ReservationStatus
import java.util.UUID

data class ReservationCancellationMessage(override val requestId: UUID, override val data: ReservationCancellationMessageData) :
  StompSuccessMessage<ReservationCancellationMessageData>

data class ReservationCancellationMessageData(val reservationId: Long, val status: ReservationStatus)

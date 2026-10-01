package com.example.server.reservation.dto

import com.example.server.reservation.types.ReservationStatus

data class ReservationCancellationResult(val reservationId: Long, val status: ReservationStatus)

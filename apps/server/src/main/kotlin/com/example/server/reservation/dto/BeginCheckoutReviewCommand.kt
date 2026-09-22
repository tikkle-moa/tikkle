package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class BeginCheckoutReviewCommand(override val requestId: UUID, override val data: BeginCheckoutReviewData) :
  StompCommand<BeginCheckoutReviewData>

data class BeginCheckoutReviewData(val performanceId: Long, val reviewToken: UUID, val sessionId: UUID? = null)

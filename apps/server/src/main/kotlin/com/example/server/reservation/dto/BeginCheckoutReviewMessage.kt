package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.time.LocalDateTime
import java.util.UUID

data class BeginCheckoutReviewMessage(override val requestId: UUID, override val data: BeginCheckoutReviewMessageData) :
  StompSuccessMessage<BeginCheckoutReviewMessageData>

data class BeginCheckoutReviewMessageData(
  val groupId: String,
  val performanceId: Long,
  val venueSeatIds: List<Long>,
  val expiresAt: LocalDateTime,
  val reviewToken: UUID,
  val sessionId: UUID? = null,
)

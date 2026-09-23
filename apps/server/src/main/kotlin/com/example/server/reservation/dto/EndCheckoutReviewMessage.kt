package com.example.server.reservation.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.util.UUID

data class EndCheckoutReviewMessage(override val requestId: UUID, override val data: EndCheckoutReviewMessageData) :
  StompSuccessMessage<EndCheckoutReviewMessageData>

data class EndCheckoutReviewMessageData(val performanceId: Long, val canResumeHold: Boolean)

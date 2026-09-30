package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class EndCheckoutReviewCommand(override val requestId: UUID, override val data: EndCheckoutReviewData) : StompCommand<EndCheckoutReviewData>

data class EndCheckoutReviewData(val performanceId: Long, val reviewToken: UUID, val groupId: String? = null)

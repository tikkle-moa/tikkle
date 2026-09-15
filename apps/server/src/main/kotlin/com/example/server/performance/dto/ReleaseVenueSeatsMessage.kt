package com.example.server.performance.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.util.UUID

data class ReleaseVenueSeatsMessage(override val requestId: UUID, override val data: List<Long>) : StompSuccessMessage<List<Long>>

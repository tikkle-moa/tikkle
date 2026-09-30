package com.example.server.performance.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.util.UUID

data class HoldVenueSeatsMessage(override val requestId: UUID, override val data: VenueSeatHoldDetail) : StompSuccessMessage<VenueSeatHoldDetail>

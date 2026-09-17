package com.example.server.performance.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.util.UUID

data class GetMyGroupHoldsMessage(override val requestId: UUID, override val data: List<VenueSeatHoldDetail>) :
  StompSuccessMessage<List<VenueSeatHoldDetail>>

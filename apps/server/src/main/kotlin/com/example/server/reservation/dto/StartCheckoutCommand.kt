package com.example.server.reservation.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class StartCheckoutCommand(override val requestId: UUID, override val data: StartCheckoutData) : StompCommand<StartCheckoutData>

data class StartCheckoutData(val performanceId: Long)

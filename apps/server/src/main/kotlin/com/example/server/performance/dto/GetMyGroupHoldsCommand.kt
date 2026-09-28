package com.example.server.performance.dto

import com.example.server.global.stomp.StompCommand
import java.util.UUID

data class GetMyGroupHoldsCommand(override val requestId: UUID, override val data: Void? = null, val sessionId: UUID? = null) : StompCommand<Void?>

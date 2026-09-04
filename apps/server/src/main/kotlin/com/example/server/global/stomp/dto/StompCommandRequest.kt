package com.example.server.global.stomp.dto

import tools.jackson.databind.JsonNode
import java.util.UUID

data class StompCommandRequest(val requestId: UUID, val action: String, val data: JsonNode)

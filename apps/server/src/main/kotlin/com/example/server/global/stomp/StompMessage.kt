package com.example.server.global.stomp

import io.swagger.v3.oas.annotations.media.Schema
import java.util.UUID

sealed interface StompMessage {
  val requestId: UUID
  val success: Boolean
}

@Schema(
  requiredProperties = ["requestId", "action", "success", "data"],
)
data class StompSuccessMessage<T : Any>(override val requestId: UUID, val data: T) : StompMessage {
  override val success = true
}

@Schema(
  requiredProperties = ["requestId", "action", "success", "error"],
)
data class StompFailureMessage(override val requestId: UUID, val error: StompErrorMessage) : StompMessage {
  override val success = false
}

@Schema(
  requiredProperties = ["code", "message"],
)
data class StompErrorMessage(val code: String, val message: String)

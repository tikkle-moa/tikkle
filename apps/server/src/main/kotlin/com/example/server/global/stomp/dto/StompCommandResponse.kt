package com.example.server.global.stomp.dto

import io.swagger.v3.oas.annotations.media.Schema
import java.util.UUID

sealed interface StompCommandResponse {
  val requestId: UUID
  val action: String
  val success: Boolean
}

@Schema(
  requiredProperties = ["requestId", "action", "success", "data"],
)
data class StompCommandSuccess<T : Any>(override val requestId: UUID, override val action: String, val data: T) : StompCommandResponse {
  override val success = true
}

@Schema(
  requiredProperties = ["requestId", "action", "success", "error"],
)
data class StompCommandFailure(override val requestId: UUID, override val action: String, val error: StompCommandError) : StompCommandResponse {
  override val success = false
}

@Schema(
  requiredProperties = ["code", "message"],
)
data class StompCommandError(val code: String, val message: String)

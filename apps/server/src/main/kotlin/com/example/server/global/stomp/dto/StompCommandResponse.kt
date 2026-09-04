package com.example.server.global.stomp.dto

import java.util.UUID

sealed interface StompCommandResponse {
  val requestId: UUID
  val action: String
  val success: Boolean
}

data class StompCommandSuccess<T>(override val requestId: UUID, override val action: String, val data: T) : StompCommandResponse {
  override val success = true
}

data class StompCommandFailure(override val requestId: UUID, override val action: String, val error: StompCommandError) : StompCommandResponse {
  override val success = false
}

data class StompCommandError(val code: String, val message: String)

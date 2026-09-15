package com.example.server.global.stomp

import java.util.UUID

sealed interface StompMessage {
  val requestId: UUID
  val success: Boolean
}

interface StompSuccessMessage<T : Any> : StompMessage {
  override val requestId: UUID
  override val success: Boolean
    get() = true

  val data: T
}

data class StompFailureMessage(override val requestId: UUID, val error: StompError, override val success: Boolean = false) : StompMessage

data class StompError(val code: String, val message: String)

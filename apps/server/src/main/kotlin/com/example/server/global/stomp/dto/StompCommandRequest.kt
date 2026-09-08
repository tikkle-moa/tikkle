package com.example.server.global.stomp.dto

import java.util.UUID

interface StompCommandRequest<T : Any> {
  val requestId: UUID
  val action: String
  val data: T
}

package com.example.server.global.stomp

import java.util.UUID

interface StompCommand<T> {
  val requestId: UUID
  val data: T
}

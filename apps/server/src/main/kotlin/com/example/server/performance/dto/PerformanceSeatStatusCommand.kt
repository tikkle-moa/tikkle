package com.example.server.performance.dto

import com.example.server.global.stomp.StompCommand
import jakarta.validation.constraints.Pattern
import java.util.UUID

data class PerformanceSeatStatusCommand(
  override val requestId: UUID,
  @field:Pattern(
    regexp = "^GET_PERFORMANCE_SEAT_SYNC$",
    message = "지원하지 않는 공연 동기화 명령입니다.",
  )
  override val data: Void? = null,
) : StompCommand<Void?>

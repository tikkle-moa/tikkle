package com.example.server.performance.dto

import com.example.server.global.stomp.StompCommand
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.util.UUID

data class HoldVenueSeatsCommand(
  override val requestId: UUID,
  @field:Size(min = 1, message = "좌석 ID 목록은 최소 1개 이상이어야 합니다.")
  override val data: List<
    @Positive(message = "좌석 ID는 양수여야 합니다.")
    Long,
    >,
  val sessionId: UUID? = null,
) : StompCommand<List<Long>>

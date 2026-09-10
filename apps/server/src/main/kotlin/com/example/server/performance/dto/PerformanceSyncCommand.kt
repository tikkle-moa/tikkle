package com.example.server.performance.dto

import com.example.server.global.stomp.dto.StompCommandRequest
import jakarta.validation.Valid
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import java.util.UUID

data class PerformanceSyncCommand(
  override val requestId: UUID,
  @field:Pattern(
    regexp = "^GET_PERFORMANCE_SEAT_SYNC$",
    message = "지원하지 않는 공연 동기화 명령입니다.",
  )
  override val action: String,
  @field:Valid
  override val data: PerformanceSyncData,
) : StompCommandRequest<PerformanceSyncData>

data class PerformanceSyncData(
  @field:Positive
  val performanceId: Long,
)

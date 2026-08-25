package com.example.server.performance.dto

import jakarta.validation.constraints.Future
import jakarta.validation.constraints.NotNull
import org.openapitools.jackson.nullable.JsonNullable
import java.time.LocalDateTime

class UpdatePerformanceRequest(
  @field:NotNull(message = "공연 시작 시각은 null일 수 없습니다.")
  @field:Future(message = "공연 시작 시각은 현재 시각 이후여야 합니다.")
  var startsAt: JsonNullable<LocalDateTime> = JsonNullable.undefined(),

  @field:Future(message = "예매 시작 시각은 현재 시각 이후여야 합니다.")
  var bookingOpensAt: JsonNullable<LocalDateTime?> = JsonNullable.undefined(),
)

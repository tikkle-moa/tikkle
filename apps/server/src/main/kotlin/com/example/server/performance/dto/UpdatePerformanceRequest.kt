package com.example.server.performance.dto

import jakarta.validation.constraints.Future
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import org.openapitools.jackson.nullable.JsonNullable
import java.time.LocalDateTime

class UpdatePerformanceRequest(
  @field:NotBlank(message = "공연 이름은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 100, message = "공연 이름은 최대 100자까지 입력할 수 있습니다.")
  var name: JsonNullable<String> = JsonNullable.undefined(),

  @field:NotNull(message = "공연 시작 시각은 null일 수 없습니다.")
  @field:Future(message = "공연 시작 시각은 현재 시각 이후여야 합니다.")
  var startsAt: JsonNullable<LocalDateTime> = JsonNullable.undefined(),

  @field:Future(message = "예매 시작 시각은 현재 시각 이후여야 합니다.")
  var bookingOpensAt: JsonNullable<LocalDateTime?> = JsonNullable.undefined(),
)

package com.example.server.performance.dto

import jakarta.validation.constraints.Future
import jakarta.validation.constraints.Positive
import java.time.LocalDateTime

data class CreatePerformanceRequest(
  @field:Positive(message = "콘서트 ID는 양수여야 합니다.")
  val concertId: Long,

  @field:Future(message = "공연 시작 시각은 현재 시각 이후여야 합니다.")
  val startsAt: LocalDateTime,

  @field:Future(message = "예매 시작 시각은 현재 시각 이후여야 합니다.")
  val bookingOpensAt: LocalDateTime? = null,
)

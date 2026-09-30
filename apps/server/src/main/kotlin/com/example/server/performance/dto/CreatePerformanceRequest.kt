package com.example.server.performance.dto

import jakarta.validation.constraints.Future
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class CreatePerformanceRequest(
  @field:Positive(message = "콘서트 ID는 양수여야 합니다.")
  val concertId: Long,

  @field:NotBlank(message = "공연 이름은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 100, message = "공연 이름은 최대 100자까지 입력할 수 있습니다.")
  val name: String,

  @field:Future(message = "공연 시작 시각은 현재 시각 이후여야 합니다.")
  val startsAt: LocalDateTime,

  @field:Future(message = "예매 시작 시각은 현재 시각 이후여야 합니다.")
  val bookingOpensAt: LocalDateTime? = null,
)

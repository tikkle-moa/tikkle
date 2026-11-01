package com.example.server.group.dto

import jakarta.validation.constraints.Positive

data class CreateGroupRequest(
  @field:Positive(message = "공연 ID는 양수여야 합니다.")
  val performanceId: Long,
)

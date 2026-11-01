package com.example.server.group.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class JoinGroupRequest(
  @field:NotBlank(message = "초대 코드는 필수입니다.")
  @field:Size(max = 36, message = "초대 코드는 최대 36자까지 입력할 수 있습니다.")
  val inviteCode: String,
)

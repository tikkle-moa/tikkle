package com.example.server.group.dto

import com.example.server.global.stomp.StompCommand
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.util.UUID

data class GroupChatCommand(
  override val requestId: UUID,

  @field:Valid
  override val data: GroupChatData,
) : StompCommand<GroupChatData>

data class GroupChatData(
  @field:Positive(message = "공연 ID는 양수여야 합니다.")
  val performanceId: Long,

  @field:NotBlank(message = "메시지는 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 1_000, message = "메시지는 최대 1,000자까지 입력할 수 있습니다.")
  val content: String,
)

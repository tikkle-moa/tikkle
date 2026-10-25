package com.example.server.group.dto

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class GroupMembershipData(
  val groupId: Long,
  val performanceId: Long,
  val inviteCode: String,
  val expiresAt: LocalDateTime,
  val leaderUserId: Long?,
  val members: List<GroupMemberData>,
)

data class GroupMemberData(val userId: Long, val nickname: String, val profileImageUrl: String?, @get:JsonProperty("isLeader") val isLeader: Boolean)

data class CreateGroupRequest(
  @field:Positive(message = "공연 ID는 양수여야 합니다.")
  val performanceId: Long,
)

data class JoinGroupRequest(
  @field:NotBlank(message = "초대 코드는 필수입니다.")
  @field:Size(max = 36, message = "초대 코드는 최대 36자까지 입력할 수 있습니다.")
  val inviteCode: String,
)

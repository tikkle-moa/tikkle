package com.example.server.group.dto

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.LocalDateTime

data class GroupMembershipResponse(
  val groupId: Long,
  val performanceId: Long,
  val inviteCode: String,
  val expiresAt: LocalDateTime,
  val leaderUserId: Long?,
  val members: List<GroupMemberData>,
)

data class GroupMemberData(val userId: Long, val nickname: String, val profileImageUrl: String?, @get:JsonProperty("isLeader") val isLeader: Boolean)

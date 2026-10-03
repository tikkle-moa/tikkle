package com.example.server.group.dto

import com.example.server.global.stomp.StompEvent
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

data class GroupChatEvent(
  override val eventId: UUID = UUID.randomUUID(),
  override val version: Long = -1,
  override val occurredAt: OffsetDateTime = OffsetDateTime.now(ZoneOffset.UTC),
  override val type: GroupChatEventType = GroupChatEventType.GROUP_CHAT,
  override val data: GroupChatEventData,
) : StompEvent<GroupChatEventType, GroupChatEventData>

enum class GroupChatEventType {
  GROUP_CHAT,
}

data class GroupChatEventData(
  val groupId: Long,
  val senderNickname: String,
  val senderProfileImageUrl: String?,
  val content: String,
  val sentAt: OffsetDateTime,
)

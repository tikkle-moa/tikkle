package com.example.server.group

import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatData
import com.example.server.group.dto.GroupChatEventData
import org.springframework.stereotype.Service
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class GroupService(private val userRepository: UserRepository, private val redisGroupService: RedisGroupService) {
  fun createGroupChatMessage(userId: Long, data: GroupChatData): GroupChatEventData {
    val user = userRepository.findById(userId).orElseThrow { CustomException(ErrorCode.FORBIDDEN, "사용자를 찾을 수 없습니다.") }
    val groupId = redisGroupService.getGroupId(userId, data.performanceId)

    return GroupChatEventData(
      groupId = groupId,
      senderNickname = user.nickname,
      senderProfileImageUrl = user.profileImageUrl,
      content = data.content,
      sentAt = OffsetDateTime.now(ZoneOffset.UTC),
    )
  }
}

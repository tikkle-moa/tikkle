package com.example.server.group

import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatData
import com.example.server.group.dto.GroupChatEventData
import com.example.server.group.repository.GroupMemberRepository
import org.springframework.stereotype.Service
import java.time.OffsetDateTime
import java.time.ZoneOffset

@Service
class GroupService(private val userRepository: UserRepository, private val groupMemberRepository: GroupMemberRepository) {
  fun createGroupChatMessage(userId: Long, data: GroupChatData): GroupChatEventData {
    val user = userRepository.findById(userId).orElseThrow { CustomException(ErrorCode.FORBIDDEN, "사용자를 찾을 수 없습니다.") }
    val groupId = getGroupId(userId, data.performanceId) ?: throw CustomException(ErrorCode.FORBIDDEN, "사용자가 속한 그룹을 찾을 수 없습니다.")

    return GroupChatEventData(
      groupId = groupId,
      senderNickname = user.nickname,
      senderProfileImageUrl = user.profileImageUrl,
      content = data.content,
      sentAt = OffsetDateTime.now(ZoneOffset.UTC),
    )
  }

  fun getGroupId(userId: Long, performanceId: Long): Long? {
    val groupId = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(userId, performanceId)
    return groupId
  }
}

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

  /**
   * TODO: 그룹 생성·가입 흐름 구현 시 사용자는 공연별 활성 그룹 하나에만 속하도록 제한해야 합니다.
   * 현재 `GroupMember`의 유니크 제약은 동일 그룹 내 중복 가입만 막으므로,
   * 이 전제가 지켜지지 않으면 단건 조회에서 예외가 발생할 수 있습니다.
   */
  fun getGroupId(userId: Long, performanceId: Long): Long? {
    val groupId = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(userId, performanceId)
    return groupId
  }
}

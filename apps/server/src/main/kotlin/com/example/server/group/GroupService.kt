package com.example.server.group

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatData
import com.example.server.group.dto.GroupChatEventData
import com.example.server.group.dto.GroupMemberData
import com.example.server.group.dto.GroupMembershipResponse
import com.example.server.group.entity.Group
import com.example.server.group.entity.GroupMember
import com.example.server.group.repository.GroupMemberRepository
import com.example.server.group.repository.GroupRepository
import com.example.server.performance.repository.PerformanceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Service
class GroupService(
  private val userRepository: UserRepository,
  private val groupRepository: GroupRepository,
  private val groupMemberRepository: GroupMemberRepository,
  private val performanceRepository: PerformanceRepository,
  private val groupChatSubscriptionRegistry: GroupChatSubscriptionRegistry,
) {
  @Transactional
  fun createGroup(userId: Long, performanceId: Long): GroupMembershipResponse {
    val user = requireUserForUpdate(userId)
    ensureNoActiveGroup(userId, performanceId)
    val performance = performanceRepository.findById(performanceId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }
    val now = nowUtc()
    if (!performance.startsAt.isAfter(now)) {
      throw CustomException(ErrorCode.CONFLICT, "이미 시작한 공연에는 그룹을 만들 수 없습니다.")
    }

    val group = groupRepository.save(
      Group(
        performance = performance,
        inviteCode = newInviteCode(),
        leader = user,
        expiresAt = performance.startsAt,
      ),
    )
    groupMemberRepository.save(GroupMember(group = group, member = user))

    return membershipData(group)
  }

  @Transactional
  fun joinGroup(userId: Long, groupId: Long, inviteCode: String): GroupMembershipResponse {
    val user = requireUserForUpdate(userId)
    val group = groupRepository.findByInviteCodeForUpdate(inviteCode.trim().lowercase())
      ?: throw CustomException(ErrorCode.NOT_FOUND, "초대 코드에 해당하는 그룹을 찾을 수 없습니다.")
    if (group.id != groupId) {
      throw CustomException(ErrorCode.NOT_FOUND, "초대 코드에 해당하는 그룹을 찾을 수 없습니다.")
    }
    if (!group.expiresAt.isAfter(nowUtc())) {
      throw CustomException(ErrorCode.CONFLICT, "만료된 그룹에는 참여할 수 없습니다.")
    }

    val existingGroupId = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(userId, group.performance.id)
    if (existingGroupId != null) {
      val message = if (existingGroupId == group.id) "이미 참여한 그룹입니다." else "같은 공연의 다른 활성 그룹에 이미 참여했습니다."
      throw CustomException(ErrorCode.CONFLICT, message)
    }

    val members = groupMemberRepository.findAllByGroupId(group.id)
    if (members.size >= MAX_MEMBER_COUNT) {
      throw CustomException(ErrorCode.CONFLICT, "그룹 정원은 최대 ${MAX_MEMBER_COUNT}명입니다.")
    }

    if (group.leader == null) {
      group.leader = members.firstOrNull()?.member ?: user
    }
    groupMemberRepository.save(GroupMember(group = group, member = user))

    return membershipData(group)
  }

  @Transactional
  fun leaveGroup(userId: Long, groupId: Long): GroupMembershipResponse {
    requireUserForUpdate(userId)
    val group = groupRepository.findByIdForUpdate(groupId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "그룹을 찾을 수 없습니다.")
    if (!group.expiresAt.isAfter(nowUtc())) {
      throw CustomException(ErrorCode.CONFLICT, "만료된 그룹에서는 탈퇴할 수 없습니다.")
    }
    val groupMember = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
      ?: throw CustomException(ErrorCode.FORBIDDEN, "그룹 구성원이 아닙니다.")

    groupChatSubscriptionRegistry.revokeGroupChat(userId, groupId)
    groupMemberRepository.delete(groupMember)
    val remainingMembers = groupMemberRepository.findAllByGroupId(groupId)
    val wasLeader = group.leader?.id == userId
    val now = nowUtc()
    when {
      remainingMembers.isEmpty() -> {
        group.leader = null
        group.expiresAt = now
      }
      wasLeader -> group.leader = remainingMembers.first().member
    }

    return membershipData(group)
  }

  @Transactional
  fun kickMember(userId: Long, groupId: Long, memberUserId: Long): GroupMembershipResponse {
    if (userId == memberUserId) {
      throw CustomException(ErrorCode.BAD_REQUEST, "그룹장은 본인을 강퇴할 수 없습니다. 탈퇴를 이용해 주세요.")
    }

    listOf(userId, memberUserId).distinct().sorted().forEach(::requireUserForUpdate)
    val group = groupRepository.findByIdForUpdate(groupId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "그룹을 찾을 수 없습니다.")
    if (!group.expiresAt.isAfter(nowUtc())) {
      throw CustomException(ErrorCode.CONFLICT, "만료된 그룹에서는 멤버를 강퇴할 수 없습니다.")
    }
    if (group.leader?.id != userId) {
      throw CustomException(ErrorCode.FORBIDDEN, "그룹장만 멤버를 강퇴할 수 있습니다.")
    }

    val groupMember = groupMemberRepository.findByGroupIdAndUserId(groupId, memberUserId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "해당 사용자는 그룹 구성원이 아닙니다.")
    groupChatSubscriptionRegistry.revokeGroupChat(memberUserId, groupId)
    groupMemberRepository.delete(groupMember)

    return membershipData(group)
  }

  fun createGroupChatMessage(userId: Long, data: GroupChatData): GroupChatEventData {
    val user = userRepository.findById(userId).orElseThrow { CustomException(ErrorCode.FORBIDDEN, "사용자를 찾을 수 없습니다.") }
    val groupId = getGroupId(userId, data.performanceId) ?: throw CustomException(ErrorCode.FORBIDDEN, "사용자가 속한 그룹을 찾을 수 없습니다.")

    return GroupChatEventData(
      groupId = groupId,
      senderId = userId,
      senderNickname = user.nickname,
      senderProfileImageUrl = user.profileImageUrl,
      content = data.content,
      sentAt = OffsetDateTime.now(ZoneOffset.UTC),
    )
  }

  fun getGroupId(userId: Long, performanceId: Long): Long? = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(userId, performanceId)

  fun isActiveMemberOfGroup(userId: Long, groupId: Long): Boolean =
    groupMemberRepository.findActiveGroupIdByUserIdAndGroupId(userId, groupId) == groupId

  @Transactional(readOnly = true)
  fun getGroup(userId: Long, groupId: Long): GroupMembershipResponse {
    val group = groupRepository.findById(groupId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "그룹을 찾을 수 없습니다.") }
    if (groupMemberRepository.findActiveGroupIdByUserIdAndGroupId(userId, groupId) == null) {
      throw CustomException(ErrorCode.FORBIDDEN, "활성 그룹 구성원만 그룹 정보를 조회할 수 있습니다.")
    }
    return membershipData(group)
  }

  private fun membershipData(group: Group): GroupMembershipResponse {
    val members = groupMemberRepository.findAllByGroupId(group.id)
    return GroupMembershipResponse(
      groupId = group.id,
      performanceId = group.performance.id,
      inviteCode = group.inviteCode,
      expiresAt = group.expiresAt,
      leaderUserId = group.leader?.id,
      members = members.map { groupMember ->
        val member = groupMember.member
        GroupMemberData(
          userId = member.id,
          nickname = member.nickname,
          profileImageUrl = member.profileImageUrl,
          isLeader = group.leader?.id == member.id,
        )
      },
    )
  }

  private fun ensureNoActiveGroup(userId: Long, performanceId: Long) {
    if (groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(userId, performanceId) != null) {
      throw CustomException(ErrorCode.CONFLICT, "같은 공연의 다른 활성 그룹에 이미 참여했습니다.")
    }
  }

  private fun requireUserForUpdate(userId: Long): User = userRepository.findByIdForUpdate(userId)
    ?: throw CustomException(ErrorCode.FORBIDDEN, "사용자를 찾을 수 없습니다.")

  private fun newInviteCode(): String {
    var inviteCode: String
    do {
      inviteCode = UUID.randomUUID().toString()
    } while (groupRepository.existsByInviteCode(inviteCode))
    return inviteCode
  }

  private fun nowUtc(): LocalDateTime = LocalDateTime.now(ZoneOffset.UTC)

  companion object {
    const val MAX_MEMBER_COUNT = 4
  }
}

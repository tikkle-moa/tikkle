package com.example.server.group

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatData
import com.example.server.group.entity.Group
import com.example.server.group.entity.GroupMember
import com.example.server.group.repository.GroupMemberRepository
import com.example.server.group.repository.GroupRepository
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.support.any
import com.example.server.venue.entity.Venue
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.doAnswer
import org.mockito.Mockito.times
import org.mockito.junit.jupiter.MockitoExtension
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class GroupServiceTest {
  @Mock lateinit var userRepository: UserRepository

  @Mock lateinit var groupRepository: GroupRepository

  @Mock lateinit var groupMemberRepository: GroupMemberRepository

  @Mock lateinit var performanceRepository: PerformanceRepository

  @InjectMocks lateinit var service: GroupService

  @Test
  fun `활성 그룹 구성원은 현재 그룹 스냅샷을 조회한다`() {
    val leader = user(USER_ID)
    val group = group(performance(), leader = leader)
    val members = listOf(GroupMember(group = group, member = leader))
    given(groupRepository.findById(GROUP_ID)).willReturn(Optional.of(group))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndGroupId(USER_ID, GROUP_ID)).willReturn(GROUP_ID)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)

    val result = service.getGroup(USER_ID, GROUP_ID)

    assertThat(result.groupId).isEqualTo(GROUP_ID)
    assertThat(result.members.single().userId).isEqualTo(USER_ID)
    assertThat(result.members.single().isLeader).isTrue()
  }

  @Test
  fun `그룹이 없으면 조회할 수 없다`() {
    given(groupRepository.findById(GROUP_ID)).willReturn(Optional.empty())

    val exception = assertThrows<CustomException> {
      service.getGroup(USER_ID, GROUP_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `활성 그룹 구성원이 아니면 그룹 조회를 거부한다`() {
    given(groupRepository.findById(GROUP_ID)).willReturn(Optional.of(group(performance())))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndGroupId(USER_ID, GROUP_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.getGroup(USER_ID, GROUP_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(groupMemberRepository).should(org.mockito.Mockito.never()).findAllByGroupId(GROUP_ID)
  }

  @Test
  fun `그룹 구성원의 채팅 메시지 데이터를 생성한다`() {
    val user = user(USER_ID)
    val commandData = GroupChatData(performanceId = PERFORMANCE_ID, content = "같이 예매해요")
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    val before = OffsetDateTime.now(ZoneOffset.UTC)

    val result = service.createGroupChatMessage(USER_ID, commandData)

    assertThat(result.groupId).isEqualTo(GROUP_ID)
    assertThat(result.senderNickname).isEqualTo(user.nickname)
    assertThat(result.senderProfileImageUrl).isEqualTo(user.profileImageUrl)
    assertThat(result.content).isEqualTo(commandData.content)
    assertThat(result.sentAt).isAfterOrEqualTo(before)
    assertThat(result.sentAt.offset).isEqualTo(ZoneOffset.UTC)
  }

  @Test
  fun `그룹에 속하지 않은 사용자의 채팅을 거부한다`() {
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user(USER_ID)))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.createGroupChatMessage(USER_ID, GroupChatData(PERFORMANCE_ID, "메시지"))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
  }

  @Test
  fun `존재하지 않는 사용자의 채팅을 거부한다`() {
    given(userRepository.findById(USER_ID)).willReturn(Optional.empty())

    val exception = assertThrows<CustomException> {
      service.createGroupChatMessage(USER_ID, GroupChatData(PERFORMANCE_ID, "메시지"))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹 생성 시 생성자를 그룹장으로 등록하고 스냅샷을 반환한다`() {
    val user = user(USER_ID)
    val performance = performance()
    val members = mutableListOf<GroupMember>()
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user)
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance))
    given(groupRepository.existsByInviteCode(anyString())).willReturn(true, false)
    given(groupRepository.save(any(Group::class.java))).willAnswer { invocation ->
      invocation.getArgument<Group>(0).apply { id = GROUP_ID }
    }
    given(groupMemberRepository.save(any(GroupMember::class.java))).willAnswer { invocation ->
      invocation.getArgument<GroupMember>(0).apply {
        id = 1L
        members.add(this)
      }
    }
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)

    val result = service.createGroup(USER_ID, PERFORMANCE_ID)

    assertThat(result.leaderUserId).isEqualTo(USER_ID)
    assertThat(result.members).hasSize(1)
    assertThat(result.members.single().userId).isEqualTo(USER_ID)
    assertThat(result.members.single().isLeader).isTrue()
    assertThat(result.inviteCode).isNotBlank()
    assertThat(result.expiresAt).isEqualTo(performance.startsAt)
    then(groupRepository).should(times(2)).existsByInviteCode(anyString())
  }

  @Test
  fun `사용자가 없으면 그룹을 생성할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.createGroup(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `이미 활성 그룹에 속한 사용자는 새 그룹을 만들 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)

    val exception = assertThrows<CustomException> {
      service.createGroup(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(performanceRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `공연 회차가 없으면 그룹을 생성할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.empty())

    val exception = assertThrows<CustomException> {
      service.createGroup(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `이미 시작한 공연에는 그룹을 만들 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(performanceRepository.findById(PERFORMANCE_ID))
      .willReturn(Optional.of(performance(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1))))

    val exception = assertThrows<CustomException> {
      service.createGroup(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(groupRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `유효한 초대 코드로 그룹에 참여한다`() {
    val user = user(USER_ID)
    val leader = user(LEADER_ID)
    val performance = performance()
    val group = group(performance, leader = leader)
    val members = mutableListOf(GroupMember(group = group, member = leader))
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user)
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group)
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)
    given(groupMemberRepository.save(any(GroupMember::class.java))).willAnswer { invocation ->
      invocation.getArgument<GroupMember>(0).apply {
        id = 2L
        members.add(this)
      }
    }

    val result = service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)

    assertThat(result.members).hasSize(2)
    assertThat(result.leaderUserId).isEqualTo(LEADER_ID)
    assertThat(result.members).anySatisfy { member ->
      assertThat(member.userId).isEqualTo(USER_ID)
      assertThat(member.isLeader).isFalse()
    }
  }

  @Test
  fun `초대 코드에 해당하는 그룹이 없으면 참여를 거부한다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `초대 코드가 다른 그룹의 것이면 참여를 거부한다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group(performance()))

    val exception = assertThrows<CustomException> {
      service.joinGroup(USER_ID, GROUP_ID + 1, INVITE_CODE)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `만료된 그룹 가입을 거부한다`() {
    val group = group(performance(), expiresAt = LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1))
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group)

    val exception = assertThrows<CustomException> {
      service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹 정원 4명을 초과하는 참여를 거부한다`() {
    val group = group(performance())
    val members = (1L..GroupService.MAX_MEMBER_COUNT.toLong()).map { userId ->
      GroupMember(group = group, member = user(userId))
    }
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group)
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)

    val exception = assertThrows<CustomException> {
      service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(groupMemberRepository).should(org.mockito.Mockito.never()).save(any(GroupMember::class.java))
  }

  @Test
  fun `이미 참여한 그룹에 중복 가입할 수 없다`() {
    val group = group(performance())
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group)
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)

    val exception = assertThrows<CustomException> {
      service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(groupMemberRepository).should(org.mockito.Mockito.never()).save(any(GroupMember::class.java))
  }

  @Test
  fun `같은 공연의 다른 활성 그룹에 참여한 사용자는 가입할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group(performance()))
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID + 1)

    val exception = assertThrows<CustomException> {
      service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(groupMemberRepository).should(org.mockito.Mockito.never()).findAllByGroupId(GROUP_ID)
  }

  @Test
  fun `그룹장이 없는 그룹에 가입하면 기존 첫 멤버에게 그룹장을 지정한다`() {
    val firstMember = user(OWNER_ID)
    val group = group(performance())
    val members = mutableListOf(GroupMember(group = group, member = firstMember))
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group)
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)
    given(groupMemberRepository.save(any(GroupMember::class.java))).willAnswer { invocation ->
      invocation.getArgument<GroupMember>(0).apply { members.add(this) }
    }

    val result = service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)

    assertThat(result.leaderUserId).isEqualTo(OWNER_ID)
    assertThat(result.members.first().isLeader).isTrue()
  }

  @Test
  fun `멤버가 없는 그룹에 가입하면 가입자를 그룹장으로 지정한다`() {
    val group = group(performance())
    val members = mutableListOf<GroupMember>()
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByInviteCodeForUpdate(INVITE_CODE)).willReturn(group)
    given(groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(USER_ID, PERFORMANCE_ID)).willReturn(null)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)
    given(groupMemberRepository.save(any(GroupMember::class.java))).willAnswer { invocation ->
      invocation.getArgument<GroupMember>(0).apply { members.add(this) }
    }

    val result = service.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)

    assertThat(result.leaderUserId).isEqualTo(USER_ID)
    assertThat(result.members.single().isLeader).isTrue()
  }

  @Test
  fun `그룹장이 탈퇴하면 가장 먼저 가입한 잔여 멤버에게 권한을 넘긴다`() {
    val leader = user(USER_ID)
    val nextLeader = user(LEADER_ID)
    val group = group(performance(), leader = leader)
    val leaderMember = GroupMember(group = group, member = leader)
    val nextLeaderMember = GroupMember(group = group, member = nextLeader)
    val members = mutableListOf(leaderMember, nextLeaderMember)
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(leader)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, USER_ID)).willReturn(leaderMember)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)
    doAnswer {
      members.remove(leaderMember)
      null
    }
      .`when`(groupMemberRepository).delete(leaderMember)

    val result = service.leaveGroup(USER_ID, GROUP_ID)

    assertThat(group.leader?.id).isEqualTo(LEADER_ID)
    assertThat(result.members).hasSize(1)
    assertThat(result.members.single().isLeader).isTrue()
  }

  @Test
  fun `마지막 멤버가 탈퇴하면 그룹을 닫고 row를 보존한다`() {
    val leader = user(USER_ID)
    val group = group(performance(), leader = leader)
    val leaderMember = GroupMember(group = group, member = leader)
    val members = mutableListOf(leaderMember)
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(leader)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, USER_ID)).willReturn(leaderMember)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)
    doAnswer {
      members.remove(leaderMember)
      null
    }
      .`when`(groupMemberRepository).delete(leaderMember)
    val before = LocalDateTime.now(ZoneOffset.UTC)

    val result = service.leaveGroup(USER_ID, GROUP_ID)

    assertThat(group.leader).isNull()
    assertThat(group.expiresAt).isAfterOrEqualTo(before)
    assertThat(result.members).isEmpty()
  }

  @Test
  fun `그룹이 없으면 탈퇴할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.leaveGroup(USER_ID, GROUP_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹 멤버가 아니면 탈퇴할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group(performance()))
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, USER_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.leaveGroup(USER_ID, GROUP_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(groupMemberRepository).should(org.mockito.Mockito.never()).delete(any(GroupMember::class.java))
  }

  @Test
  fun `그룹장이 아닌 멤버가 탈퇴하면 그룹장을 유지한다`() {
    val leader = user(LEADER_ID)
    val member = user(USER_ID)
    val group = group(performance(), leader = leader)
    val memberRow = GroupMember(group = group, member = member)
    val remainingMembers = mutableListOf(GroupMember(group = group, member = leader), memberRow)
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(member)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, USER_ID)).willReturn(memberRow)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(remainingMembers)
    doAnswer {
      remainingMembers.remove(memberRow)
      null
    }
      .`when`(groupMemberRepository).delete(memberRow)

    val result = service.leaveGroup(USER_ID, GROUP_ID)

    assertThat(group.leader?.id).isEqualTo(LEADER_ID)
    assertThat(result.members.single().isLeader).isTrue()
  }

  @Test
  fun `그룹장이 지정되지 않은 그룹에서 멤버가 탈퇴해도 잔여 그룹장을 지정하지 않는다`() {
    val member = user(USER_ID)
    val remainingMember = user(LEADER_ID)
    val group = group(performance())
    val memberRow = GroupMember(group = group, member = member)
    val remainingMembers = mutableListOf(memberRow, GroupMember(group = group, member = remainingMember))
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(member)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, USER_ID)).willReturn(memberRow)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(remainingMembers)
    doAnswer {
      remainingMembers.remove(memberRow)
      null
    }
      .`when`(groupMemberRepository).delete(memberRow)

    val result = service.leaveGroup(USER_ID, GROUP_ID)

    assertThat(result.leaderUserId).isNull()
    assertThat(result.members.single().isLeader).isFalse()
  }

  @Test
  fun `비그룹장은 멤버를 강퇴할 수 없다`() {
    val actor = user(USER_ID)
    val target = user(LEADER_ID)
    val owner = user(OWNER_ID)
    val group = group(performance(), leader = owner)
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(actor)
    given(userRepository.findByIdForUpdate(LEADER_ID)).willReturn(target)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)

    val exception = assertThrows<CustomException> {
      service.kickMember(USER_ID, GROUP_ID, LEADER_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹장은 본인을 강퇴할 수 없다`() {
    val exception = assertThrows<CustomException> {
      service.kickMember(USER_ID, GROUP_ID, USER_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    then(userRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹이 없으면 멤버를 강퇴할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(userRepository.findByIdForUpdate(LEADER_ID)).willReturn(user(LEADER_ID))
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.kickMember(USER_ID, GROUP_ID, LEADER_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `만료된 그룹에서는 멤버를 강퇴할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(userRepository.findByIdForUpdate(LEADER_ID)).willReturn(user(LEADER_ID))
    given(groupRepository.findByIdForUpdate(GROUP_ID))
      .willReturn(group(performance(), expiresAt = LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1), leader = user(USER_ID)))

    val exception = assertThrows<CustomException> {
      service.kickMember(USER_ID, GROUP_ID, LEADER_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹장이 지정되지 않은 그룹에서는 멤버를 강퇴할 수 없다`() {
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(user(USER_ID))
    given(userRepository.findByIdForUpdate(LEADER_ID)).willReturn(user(LEADER_ID))
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group(performance()))

    val exception = assertThrows<CustomException> {
      service.kickMember(USER_ID, GROUP_ID, LEADER_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(groupMemberRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `다른 그룹의 사용자를 강퇴할 수 없다`() {
    val actor = user(USER_ID)
    val target = user(LEADER_ID)
    val group = group(performance(), leader = actor)
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(actor)
    given(userRepository.findByIdForUpdate(LEADER_ID)).willReturn(target)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, LEADER_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.kickMember(USER_ID, GROUP_ID, LEADER_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(groupMemberRepository).should(org.mockito.Mockito.never()).delete(any(GroupMember::class.java))
  }

  @Test
  fun `그룹장은 그룹원을 강퇴하고 변경된 스냅샷을 반환한다`() {
    val leader = user(USER_ID)
    val target = user(LEADER_ID)
    val group = group(performance(), leader = leader)
    val leaderMember = GroupMember(group = group, member = leader)
    val targetMember = GroupMember(group = group, member = target)
    val members = mutableListOf(leaderMember, targetMember)
    given(userRepository.findByIdForUpdate(USER_ID)).willReturn(leader)
    given(userRepository.findByIdForUpdate(LEADER_ID)).willReturn(target)
    given(groupRepository.findByIdForUpdate(GROUP_ID)).willReturn(group)
    given(groupMemberRepository.findByGroupIdAndUserId(GROUP_ID, LEADER_ID)).willReturn(targetMember)
    given(groupMemberRepository.findAllByGroupId(GROUP_ID)).willReturn(members)
    doAnswer {
      members.remove(targetMember)
      null
    }
      .`when`(groupMemberRepository).delete(targetMember)

    val result = service.kickMember(USER_ID, GROUP_ID, LEADER_ID)

    assertThat(result.members).hasSize(1)
    assertThat(result.members.single().userId).isEqualTo(USER_ID)
  }

  private fun user(id: Long) = User(
    id = id,
    email = "user$id@example.com",
    nickname = "사용자$id",
  )

  private fun group(performance: Performance, expiresAt: LocalDateTime = performance.startsAt, leader: User? = null) = Group(
    id = GROUP_ID,
    performance = performance,
    inviteCode = INVITE_CODE,
    leader = leader,
    expiresAt = expiresAt,
  )

  private fun performance(startsAt: LocalDateTime = LocalDateTime.now(ZoneOffset.UTC).plusDays(1)) = Performance(
    id = PERFORMANCE_ID,
    concert = Concert(
      venue = Venue(
        name = "테스트 공연장",
        address = "서울",
        width = BigDecimal("100.00"),
        height = BigDecimal("100.00"),
        stagePositionX = BigDecimal("50.00"),
        stagePositionY = BigDecimal("10.00"),
        stageWidth = BigDecimal("40.00"),
        stageHeight = BigDecimal("10.00"),
      ),
      title = "테스트 공연",
      genre = ConcertGenre.BALLAD,
    ),
    name = "1회차",
    startsAt = startsAt,
  )

  companion object {
    private const val USER_ID = 1L
    private const val LEADER_ID = 2L
    private const val OWNER_ID = 3L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = 100L
    private const val INVITE_CODE = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
  }
}

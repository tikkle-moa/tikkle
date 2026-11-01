package com.example.server.group

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.group.dto.CreateGroupRequest
import com.example.server.group.dto.GroupMemberData
import com.example.server.group.dto.GroupMembershipResponse
import com.example.server.group.dto.JoinGroupRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class GroupControllerTest {
  @Mock lateinit var groupService: GroupService

  @InjectMocks lateinit var controller: GroupController

  @Test
  fun `그룹 생성은 생성자와 그룹 스냅샷을 반환한다`() {
    val snapshot = snapshot()
    given(groupService.createGroup(USER_ID, PERFORMANCE_ID)).willReturn(snapshot)

    val response = controller.createGroup(CreateGroupRequest(PERFORMANCE_ID), loginUser())

    assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    assertThat(response.body?.data).isEqualTo(snapshot)
  }

  @Test
  fun `그룹 및 멤버 목록을 REST로 조회한다`() {
    val snapshot = snapshot()
    given(groupService.getGroup(USER_ID, GROUP_ID)).willReturn(snapshot)

    val response = controller.getGroup(GROUP_ID, loginUser())

    assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    assertThat(response.body?.data).isEqualTo(snapshot)
  }

  @Test
  fun `초대 코드 참여는 변경된 그룹 스냅샷을 반환한다`() {
    val snapshot = snapshot()
    given(groupService.joinGroup(USER_ID, GROUP_ID, INVITE_CODE)).willReturn(snapshot)

    val response = controller.joinGroup(GROUP_ID, JoinGroupRequest(INVITE_CODE), loginUser())

    assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    assertThat(response.body?.data).isEqualTo(snapshot)
  }

  @Test
  fun `그룹 탈퇴를 서비스에 위임하고 변경된 스냅샷을 반환한다`() {
    val snapshot = snapshot()
    given(groupService.leaveGroup(USER_ID, GROUP_ID)).willReturn(snapshot)

    val response = controller.leaveGroup(GROUP_ID, loginUser())

    assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    assertThat(response.body?.data).isEqualTo(snapshot)
    then(groupService).should().leaveGroup(USER_ID, GROUP_ID)
  }

  @Test
  fun `그룹원 강퇴를 서비스에 위임하고 변경된 스냅샷을 반환한다`() {
    val snapshot = snapshot()
    given(groupService.kickMember(USER_ID, GROUP_ID, MEMBER_ID)).willReturn(snapshot)

    val response = controller.kickMember(GROUP_ID, MEMBER_ID, loginUser())

    assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
    assertThat(response.body?.data).isEqualTo(snapshot)
    then(groupService).should().kickMember(USER_ID, GROUP_ID, MEMBER_ID)
  }

  @Test
  fun `그룹 멤버 스냅샷은 isLeader JSON 필드를 사용한다`() {
    val json = ObjectMapper().writeValueAsString(
      GroupMemberData(
        userId = USER_ID,
        nickname = "그룹장",
        profileImageUrl = null,
        isLeader = true,
      ),
    )

    assertThat(json).contains("\"isLeader\":true")
  }

  @Test
  fun `그룹 조회와 생명주기 동작은 REST 경로로 등록한다`() {
    val classMapping = GroupController::class.java.getAnnotation(org.springframework.web.bind.annotation.RequestMapping::class.java)
    val getMethod = GroupController::class.java.getDeclaredMethod("getGroup", Long::class.javaPrimitiveType, LoginUserResult::class.java)
    val createMethod = GroupController::class.java.getDeclaredMethod("createGroup", CreateGroupRequest::class.java, LoginUserResult::class.java)
    val joinMethod = GroupController::class.java.getDeclaredMethod(
      "joinGroup",
      Long::class.javaPrimitiveType,
      JoinGroupRequest::class.java,
      LoginUserResult::class.java,
    )
    val leaveMethod = GroupController::class.java.getDeclaredMethod("leaveGroup", Long::class.javaPrimitiveType, LoginUserResult::class.java)
    val kickMethod = GroupController::class.java.getDeclaredMethod(
      "kickMember",
      Long::class.javaPrimitiveType,
      Long::class.javaPrimitiveType,
      LoginUserResult::class.java,
    )

    assertThat(classMapping.value).containsExactly("/groups")
    assertThat(getMethod.getAnnotation(GetMapping::class.java).value).containsExactly("/{groupId}")
    assertThat(createMethod.getAnnotation(PostMapping::class.java).value).isEmpty()
    assertThat(joinMethod.getAnnotation(PostMapping::class.java).value).containsExactly("/{groupId}/join")
    assertThat(leaveMethod.getAnnotation(DeleteMapping::class.java).value).containsExactly("/{groupId}/leave")
    assertThat(kickMethod.getAnnotation(DeleteMapping::class.java).value).containsExactly("/{groupId}/members/{memberUserId}")
  }

  private fun snapshot() = GroupMembershipResponse(
    groupId = GROUP_ID,
    performanceId = PERFORMANCE_ID,
    inviteCode = INVITE_CODE,
    expiresAt = LocalDateTime.of(2026, 10, 20, 19, 0),
    leaderUserId = USER_ID,
    members = emptyList(),
  )

  private fun loginUser() = LoginUserResult(USER_ID, UserRole.USER)

  companion object {
    private const val USER_ID = 1L
    private const val MEMBER_ID = 2L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = 100L
    private const val INVITE_CODE = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa"
  }
}

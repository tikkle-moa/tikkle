package com.example.server.group

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatCommand
import com.example.server.group.dto.GroupChatData
import com.example.server.group.dto.GroupChatEventData
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.security.core.Authentication
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class GroupStompControllerTest {
  @Mock lateinit var groupService: GroupService

  @Mock lateinit var groupStompPublisher: GroupStompPublisher

  @Mock lateinit var authentication: Authentication

  @InjectMocks lateinit var controller: GroupStompController

  @Test
  fun `인증 사용자의 채팅을 그룹 topic으로 발행한다`() {
    val command = GroupChatCommand(REQUEST_ID, GroupChatData(PERFORMANCE_ID, "같이 예매해요"))
    val eventData = GroupChatEventData(
      groupId = GROUP_ID,
      senderNickname = "티클",
      senderProfileImageUrl = null,
      content = command.data.content,
      sentAt = OffsetDateTime.of(2026, 10, 1, 10, 0, 0, 0, ZoneOffset.UTC),
    )
    given(authentication.principal).willReturn(LoginUserResult(USER_ID, UserRole.USER))
    given(groupService.createGroupChatMessage(USER_ID, command.data)).willReturn(eventData)

    controller.sendGroupChatMessage(command, authentication)

    then(groupStompPublisher).should().publishGroupChatMessage(GROUP_ID, eventData)
  }

  @Test
  fun `인증 사용자가 아니면 채팅 명령을 거부한다`() {
    given(authentication.principal).willReturn("anonymousUser")

    val exception = assertThrows<CustomException> {
      controller.sendGroupChatMessage(
        GroupChatCommand(REQUEST_ID, GroupChatData(PERFORMANCE_ID, "같이 예매해요")),
        authentication,
      )
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.UNAUTHORIZED)
    then(groupService).shouldHaveNoInteractions()
    then(groupStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `그룹 채팅 명령 destination을 사용한다`() {
    val classMapping = GroupStompController::class.java.getAnnotation(MessageMapping::class.java)
    val method = GroupStompController::class.java.getDeclaredMethod(
      "sendGroupChatMessage",
      GroupChatCommand::class.java,
      Authentication::class.java,
    )

    assertThat(classMapping.value).containsExactly("/groups")
    assertThat(method.getAnnotation(MessageMapping::class.java).value).containsExactly("/chat")
  }

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = 1L
    private val REQUEST_ID = UUID.fromString("f8ef0eb0-6a2a-4b34-bca8-5ce51c930aa3")
  }
}

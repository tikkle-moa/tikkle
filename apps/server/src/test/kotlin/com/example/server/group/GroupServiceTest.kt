package com.example.server.group

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatData
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class GroupServiceTest {
  @Mock lateinit var userRepository: UserRepository

  @Mock lateinit var redisGroupService: RedisGroupService

  @InjectMocks lateinit var service: GroupService

  @Test
  fun `그룹 구성원의 채팅 메시지 데이터를 생성한다`() {
    val user = User(
      id = USER_ID,
      email = "user@example.com",
      nickname = "티클",
      profileImageUrl = "https://example.com/profile.png",
    )
    val commandData = GroupChatData(performanceId = PERFORMANCE_ID, content = "같이 예매해요")
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    given(redisGroupService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
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
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user()))
    given(redisGroupService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(null)

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
    then(redisGroupService).shouldHaveNoInteractions()
  }

  private fun user() = User(
    id = USER_ID,
    email = "user@example.com",
    nickname = "티클",
  )

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = "group-1"
  }
}

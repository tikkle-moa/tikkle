package com.example.server.group

import com.example.server.group.dto.GroupChatEvent
import com.example.server.group.dto.GroupChatEventData
import com.example.server.group.dto.GroupChatEventType
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.time.OffsetDateTime
import java.time.ZoneOffset

@ExtendWith(MockitoExtension::class)
class GroupStompPublisherTest {
  @Mock lateinit var messagingTemplate: SimpMessagingTemplate

  @InjectMocks lateinit var publisher: GroupStompPublisher

  @Test
  fun `그룹 채팅 이벤트를 그룹 전용 topic으로 발행한다`() {
    val eventData = GroupChatEventData(
      groupId = GROUP_ID,
      senderNickname = "티클",
      senderProfileImageUrl = "https://example.com/profile.png",
      content = "같이 예매해요",
      sentAt = OffsetDateTime.of(2026, 10, 1, 10, 0, 0, 0, ZoneOffset.UTC),
    )

    publisher.publishGroupChatMessage(GROUP_ID, eventData)

    val destination = ArgumentCaptor.forClass(String::class.java)
    val payload = ArgumentCaptor.forClass(Any::class.java)
    then(messagingTemplate).should().convertAndSend(destination.capture(), payload.capture())

    val event = payload.value as GroupChatEvent
    assertThat(destination.value).isEqualTo("/topic/groups/$GROUP_ID/chat")
    assertThat(event.type).isEqualTo(GroupChatEventType.GROUP_CHAT)
    assertThat(event.data).isEqualTo(eventData)
    assertThat(event.occurredAt.offset).isEqualTo(ZoneOffset.UTC)
  }

  companion object {
    private const val GROUP_ID = 1L
  }
}

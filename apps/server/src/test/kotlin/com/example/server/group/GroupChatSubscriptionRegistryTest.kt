package com.example.server.group

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessageType
import org.springframework.messaging.support.MessageBuilder

@ExtendWith(MockitoExtension::class)
class GroupChatSubscriptionRegistryTest {
  @Mock
  lateinit var clientInboundChannel: MessageChannel

  @Mock
  lateinit var channel: MessageChannel

  private lateinit var registry: GroupChatSubscriptionRegistry

  @Test
  fun `탈퇴한 그룹 채팅 구독만 해제하고 다른 구독은 유지한다`() {
    registry = GroupChatSubscriptionRegistry(clientInboundChannel)
    registry.registerIfMember(USER_ID, GROUP_ID, SESSION_ID, GROUP_SUBSCRIPTION_ID) { true }
    registry.registerIfMember(USER_ID, OTHER_GROUP_ID, SESSION_ID, OTHER_SUBSCRIPTION_ID) { true }

    registry.unsubscribeGroupChat(USER_ID, GROUP_ID)

    val revokedMessage = outboundMessage(SESSION_ID, GROUP_SUBSCRIPTION_ID, "/topic/groups/$GROUP_ID/chat")
    val otherGroupMessage = outboundMessage(SESSION_ID, OTHER_SUBSCRIPTION_ID, "/topic/groups/$OTHER_GROUP_ID/chat")
    val otherTopicMessage = outboundMessage(SESSION_ID, GROUP_SUBSCRIPTION_ID, "/topic/performances/1/status")

    assertThat(registry.preSend(revokedMessage, channel)).isNull()
    assertThat(registry.preSend(otherGroupMessage, channel)).isSameAs(otherGroupMessage)
    assertThat(registry.preSend(otherTopicMessage, channel)).isSameAs(otherTopicMessage)

    val unsubscribeCaptor = ArgumentCaptor.forClass(Message::class.java)
    then(clientInboundChannel).should().send(unsubscribeCaptor.capture())
    val headers = unsubscribeCaptor.value.headers
    assertThat(SimpMessageHeaderAccessor.getMessageType(headers)).isEqualTo(SimpMessageType.UNSUBSCRIBE)
    assertThat(SimpMessageHeaderAccessor.getSessionId(headers)).isEqualTo(SESSION_ID)
    assertThat(SimpMessageHeaderAccessor.getSubscriptionId(headers)).isEqualTo(GROUP_SUBSCRIPTION_ID)
    assertThat(headers[GroupChatSubscriptionRegistry.SERVER_REVOCATION_HEADER]).isEqualTo(true)
  }

  @Test
  fun `비멤버 구독은 등록하지 않는다`() {
    registry = GroupChatSubscriptionRegistry(clientInboundChannel)

    val registered = registry.registerIfMember(USER_ID, GROUP_ID, SESSION_ID, GROUP_SUBSCRIPTION_ID) { false }
    val message = outboundMessage(SESSION_ID, GROUP_SUBSCRIPTION_ID, "/topic/groups/$GROUP_ID/chat")

    assertThat(registered).isFalse()
    assertThat(registry.preSend(message, channel)).isSameAs(message)
    then(clientInboundChannel).shouldHaveNoInteractions()
  }

  private fun outboundMessage(sessionId: String, subscriptionId: String, destination: String): Message<String> {
    val accessor = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE).apply {
      this.sessionId = sessionId
      this.subscriptionId = subscriptionId
      this.destination = destination
      setLeaveMutable(true)
    }
    return MessageBuilder.createMessage("chat", accessor.messageHeaders)
  }

  companion object {
    private const val USER_ID = 1L
    private const val GROUP_ID = 10L
    private const val OTHER_GROUP_ID = 20L
    private const val SESSION_ID = "session-id"
    private const val GROUP_SUBSCRIPTION_ID = "group-subscription"
    private const val OTHER_SUBSCRIPTION_ID = "other-subscription"
  }
}

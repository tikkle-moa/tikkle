package com.example.server.global.security

import com.example.server.auth.dto.AccessTokenPayload
import com.example.server.auth.refreshTokenKey
import com.example.server.auth.types.UserRole
import com.example.server.global.stomp.StompFailureMessage
import com.example.server.group.GroupChatSubscriptionRegistry
import com.example.server.group.GroupService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.beans.factory.ObjectProvider
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.MessageBuilder
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertSame

@ExtendWith(MockitoExtension::class)
class StompAuthenticationChannelInterceptorTest {
  @Mock
  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock
  lateinit var stringValueOperations: ValueOperations<String, String>

  @Mock
  lateinit var groupService: GroupService

  @Mock
  lateinit var channel: MessageChannel

  @Mock
  lateinit var messagingTemplateProvider: ObjectProvider<SimpMessagingTemplate>

  @Mock
  lateinit var messagingTemplate: SimpMessagingTemplate

  private lateinit var groupChatSubscriptionRegistry: GroupChatSubscriptionRegistry

  private lateinit var interceptor: StompAuthenticationChannelInterceptor

  @BeforeEach
  fun setUp() {
    groupChatSubscriptionRegistry = GroupChatSubscriptionRegistry(channel)
    interceptor = StompAuthenticationChannelInterceptor(stringRedisTemplate, groupService, groupChatSubscriptionRegistry, messagingTemplateProvider)
  }

  @Nested
  inner class ValidateInboundMessage {
    @Test
    fun `유효한 인증 세션의 SEND 메시지는 통과한다`() {
      val payload = validPayload()
      mockStoredSession(payload)

      val message = stompMessage(
        command = StompCommand.SEND,
        authentication = authentication(payload),
      )

      val result = interceptor.preSend(message, channel)

      assertSame(message, result)
    }

    @Test
    fun `유효한 인증 세션의 SUBSCRIBE 메시지는 통과한다`() {
      val payload = validPayload()
      mockStoredSession(payload)

      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
      )

      val result = interceptor.preSend(message, channel)

      assertSame(message, result)
    }

    @Test
    fun `그룹 채팅이 아닌 topic 구독은 그룹 멤버십 검증 없이 통과한다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/performances/1/status",
      )

      val result = interceptor.preSend(message, channel)

      assertSame(message, result)
      then(groupService).shouldHaveNoInteractions()
    }

    @Test
    fun `그룹 구성원은 그룹 채팅 topic을 구독할 수 있다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      given(groupService.isActiveMemberOfGroup(payload.userId, GROUP_ID)).willReturn(true)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/groups/$GROUP_ID/chat",
      )

      val result = interceptor.preSend(message, channel)

      assertSame(message, result)
    }

    @Test
    fun `그룹에 속하지 않은 사용자는 그룹 채팅 topic을 구독할 수 없다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      given(groupService.isActiveMemberOfGroup(payload.userId, GROUP_ID)).willReturn(false)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/groups/$GROUP_ID/chat",
      )

      assertSubscriptionFailure(message)

      then(groupService).should().isActiveMemberOfGroup(payload.userId, GROUP_ID)
    }

    @Test
    fun `와일드카드로 그룹 채팅 topic을 구독할 수 없다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/groups/**/chat",
      )

      assertSubscriptionFailure(message)

      then(groupService).shouldHaveNoInteractions()
    }

    @Test
    fun `topic prefix 뒤 와일드카드로 그룹 채팅을 구독할 수 없다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic*/groups/**/chat",
      )

      assertSubscriptionFailure(message)

      then(groupService).shouldHaveNoInteractions()
    }

    @Test
    fun `와일드카드로 모든 topic을 구독할 수 없다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/**",
      )

      assertSubscriptionFailure(message)

      then(groupService).shouldHaveNoInteractions()
    }

    @Test
    fun `그룹 ID만으로 그룹 채팅 topic을 구독할 수 있다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      given(groupService.isActiveMemberOfGroup(payload.userId, GROUP_ID)).willReturn(true)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/groups/$GROUP_ID/chat",
      )

      assertSame(message, interceptor.preSend(message, channel))

      then(groupService).should().isActiveMemberOfGroup(payload.userId, GROUP_ID)
    }

    @Test
    fun `숫자가 아닌 그룹 ID의 그룹 채팅 topic을 구독할 수 없다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/groups/not-a-number/chat",
      )

      assertSubscriptionFailure(message)

      then(groupService).shouldHaveNoInteractions()
    }

    @Test
    fun `다른 그룹의 채팅 topic을 구독할 수 없다`() {
      val payload = validPayload()
      mockStoredSession(payload)
      given(groupService.isActiveMemberOfGroup(payload.userId, GROUP_ID + 1)).willReturn(false)
      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
        destination = "/topic/groups/${GROUP_ID + 1}/chat",
      )

      assertSubscriptionFailure(message)
    }

    @Test
    fun `인증 정보가 없으면 메시지를 거부한다`() {
      val message = stompMessage(command = StompCommand.SEND)

      assertThrows<AccessDeniedException> {
        interceptor.preSend(message, channel)
      }

      then(stringRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `access token payload가 없으면 메시지를 거부한다`() {
      val authentication = UsernamePasswordAuthenticationToken(
        "1",
        null,
      )
      val message = stompMessage(
        command = StompCommand.SEND,
        authentication = authentication,
      )

      assertThrows<AccessDeniedException> {
        interceptor.preSend(message, channel)
      }

      then(stringRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `만료된 access token이면 메시지를 거부한다`() {
      val payload = validPayload(
        expiresAt = Instant.now().minusSeconds(1),
      )
      val message = stompMessage(
        command = StompCommand.SEND,
        authentication = authentication(payload),
      )

      assertThrows<AccessDeniedException> {
        interceptor.preSend(message, channel)
      }

      then(stringRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `로그아웃 또는 refresh 회전으로 인증 세션이 삭제되면 메시지를 거부한다`() {
      val payload = validPayload()

      given(stringRedisTemplate.opsForValue())
        .willReturn(stringValueOperations)
      given(stringValueOperations.get(refreshTokenKey(payload.tokenId)))
        .willReturn(null)

      val message = stompMessage(
        command = StompCommand.SEND,
        authentication = authentication(payload),
      )

      assertThrows<AccessDeniedException> {
        interceptor.preSend(message, channel)
      }
    }

    @Test
    fun `Redis 세션의 사용자 ID가 token 사용자와 다르면 메시지를 거부한다`() {
      val payload = validPayload()

      given(stringRedisTemplate.opsForValue())
        .willReturn(stringValueOperations)
      given(stringValueOperations.get(refreshTokenKey(payload.tokenId)))
        .willReturn("2")

      val message = stompMessage(
        command = StompCommand.SUBSCRIBE,
        authentication = authentication(payload),
      )

      assertThrows<AccessDeniedException> {
        interceptor.preSend(message, channel)
      }
    }

    @Test
    fun `CONNECT 메시지는 inbound 세션 검증 대상이 아니다`() {
      val message = stompMessage(command = StompCommand.CONNECT)

      val result = interceptor.preSend(message, channel)

      assertSame(message, result)
      then(stringRedisTemplate).shouldHaveNoInteractions()
    }
  }

  @Test
  fun `세션 ID가 없으면 구독을 차단하고 오류 전송은 생략한다`() {
    val payload = validPayload()
    mockStoredSession(payload)
    val message = stompMessage(
      command = StompCommand.SUBSCRIBE,
      authentication = authentication(payload),
      destination = "/topic/**",
      sessionId = null,
    )
    assertNull(interceptor.preSend(message, channel))
    then(messagingTemplateProvider).shouldHaveNoInteractions()
    then(messagingTemplate).shouldHaveNoInteractions()
  }

  @Test
  fun `서버와 클라이언트 구독 해제 후 미등록 그룹 메시지를 차단한다`() {
    val payload = validPayload()
    mockStoredSession(payload)
    given(groupService.isActiveMemberOfGroup(payload.userId, GROUP_ID)).willReturn(true)
    val subscribeMessage = stompMessage(
      command = StompCommand.SUBSCRIBE,
      authentication = authentication(payload),
      destination = "/topic/groups/$GROUP_ID/chat",
    )
    interceptor.preSend(subscribeMessage, channel)
    groupChatSubscriptionRegistry.revokeGroupChat(payload.userId, GROUP_ID)

    val outboundMessage = groupChatOutboundMessage()
    assertNull(groupChatSubscriptionRegistry.preSend(outboundMessage, channel))

    val serverUnsubscribe = StompHeaderAccessor.create(StompCommand.UNSUBSCRIBE).apply {
      sessionId = "session-id"
      subscriptionId = "subscription-id"
      setHeader(GroupChatSubscriptionRegistry.SERVER_REVOCATION_HEADER, true)
    }
    interceptor.preSend(MessageBuilder.createMessage("", serverUnsubscribe.messageHeaders), channel)
    assertNull(groupChatSubscriptionRegistry.preSend(outboundMessage, channel))

    val clientUnsubscribe = stompMessage(command = StompCommand.UNSUBSCRIBE)
    interceptor.preSend(clientUnsubscribe, channel)
    assertNull(groupChatSubscriptionRegistry.preSend(outboundMessage, channel))
  }

  @Test
  fun `메시지가 없는 구독 권한 예외는 기본 오류 메시지로 전송한다`() {
    val payload = validPayload()
    mockStoredSession(payload)
    given(groupService.isActiveMemberOfGroup(payload.userId, GROUP_ID))
      .willThrow(object : AccessDeniedException("권한 오류") {
        override val message: String? = null
      })
    val message = stompMessage(
      command = StompCommand.SUBSCRIBE,
      authentication = authentication(payload),
      destination = "/topic/groups/$GROUP_ID/chat",
    )

    val failure = assertSubscriptionFailure(message)

    assertEquals("구독 권한이 없습니다.", failure.error.message)
  }

  private fun assertSubscriptionFailure(message: Message<*>): StompFailureMessage {
    given(messagingTemplateProvider.getObject()).willReturn(messagingTemplate)
    assertNull(interceptor.preSend(message, channel))

    val failureCaptor = ArgumentCaptor.forClass(StompFailureMessage::class.java)
    val headersCaptor = ArgumentCaptor.forClass(org.springframework.messaging.MessageHeaders::class.java)
    then(messagingTemplate).should().convertAndSendToUser(
      org.mockito.ArgumentMatchers.eq("1"),
      org.mockito.ArgumentMatchers.eq("/queue/stomp-errors"),
      failureCaptor.capture(),
      headersCaptor.capture(),
    )
    assertFalse(failureCaptor.value.success)
    assertEquals("ACCESS_DENIED", failureCaptor.value.error.code)
    assertEquals("session-id", headersCaptor.value[SimpMessageHeaderAccessor.SESSION_ID_HEADER])
    return failureCaptor.value
  }

  private fun validPayload(
    userId: Long = 1L,
    tokenId: String = "refresh-token-id",
    expiresAt: Instant = Instant.now().plusSeconds(60),
  ): AccessTokenPayload = AccessTokenPayload(
    userId = userId,
    role = UserRole.USER,
    tokenId = tokenId,
    expiresAt = expiresAt,
  )

  private fun mockStoredSession(payload: AccessTokenPayload) {
    given(stringRedisTemplate.opsForValue())
      .willReturn(stringValueOperations)
    given(stringValueOperations.get(refreshTokenKey(payload.tokenId)))
      .willReturn(payload.userId.toString())
  }

  private fun authentication(payload: AccessTokenPayload): Authentication = UsernamePasswordAuthenticationToken(
    payload.userId.toString(),
    null,
  ).apply {
    details = payload
  }

  private fun stompMessage(
    command: StompCommand,
    authentication: Authentication? = null,
    destination: String? = null,
    sessionId: String? = "session-id",
  ): Message<String> {
    val accessor = StompHeaderAccessor.create(command)
    accessor.sessionId = sessionId
    accessor.subscriptionId = "subscription-id"

    if (authentication != null) {
      accessor.user = authentication
    }
    if (destination != null) {
      accessor.destination = destination
    }
    return MessageBuilder.createMessage(
      "",
      accessor.messageHeaders,
    )
  }

  private fun groupChatOutboundMessage(): Message<String> {
    val accessor = SimpMessageHeaderAccessor.create(org.springframework.messaging.simp.SimpMessageType.MESSAGE).apply {
      sessionId = "session-id"
      subscriptionId = "subscription-id"
      destination = "/topic/groups/$GROUP_ID/chat"
      setLeaveMutable(true)
    }
    return MessageBuilder.createMessage("chat", accessor.messageHeaders)
  }

  companion object {
    private const val GROUP_ID = 100L
  }
}

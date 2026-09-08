package com.example.server.global.security

import com.example.server.auth.dto.AccessTokenPayload
import com.example.server.auth.refreshTokenKey
import com.example.server.auth.types.UserRole
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.MessageBuilder
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import java.time.Instant
import kotlin.test.assertSame

@ExtendWith(MockitoExtension::class)
class StompAuthenticationChannelInterceptorTest {
  @Mock
  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock
  lateinit var stringValueOperations: ValueOperations<String, String>

  @Mock
  lateinit var channel: MessageChannel

  private lateinit var interceptor: StompAuthenticationChannelInterceptor

  @BeforeEach
  fun setUp() {
    interceptor = StompAuthenticationChannelInterceptor(stringRedisTemplate)
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

  private fun stompMessage(command: StompCommand, authentication: Authentication? = null): Message<String> {
    val accessor = StompHeaderAccessor.create(command)

    if (authentication != null) {
      accessor.user = authentication
    }

    return MessageBuilder.createMessage(
      "",
      accessor.messageHeaders,
    )
  }
}

package com.example.server.global.security

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.AccessTokenPayload
import com.example.server.auth.refreshTokenKey
import com.example.server.auth.types.UserRole
import com.example.server.config.TestcontainersConfig
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.converter.StringMessageConverter
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.messaging.simp.stomp.StompFrameHandler
import org.springframework.messaging.simp.stomp.StompHeaders
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Controller
import org.springframework.test.context.ActiveProfiles
import org.springframework.web.socket.WebSocketHttpHeaders
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import org.springframework.web.socket.messaging.WebSocketStompClient
import java.lang.reflect.Type
import java.time.Duration
import java.util.UUID
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(
  TestcontainersConfig::class,
  StompAuthenticationIntegrationTestConfig::class,
)
class StompAuthenticationIntegrationTest {
  @LocalServerPort
  private var port = 0

  @Autowired
  lateinit var jwtTokenProvider: JwtTokenProvider

  @Autowired
  lateinit var stringRedisTemplate: StringRedisTemplate

  private val refreshTokenKeys = mutableSetOf<String>()

  @AfterEach
  fun tearDown() {
    refreshTokenKeys.forEach(stringRedisTemplate::delete)
  }

  @Test
  fun `WebSocket handshake 인증 정보는 inbound 명령과 개인 queue 응답까지 유지된다`() {
    val tokenId = UUID.randomUUID().toString()
    val userId = 1L
    val refreshTokenKey = refreshTokenKey(tokenId)

    stringRedisTemplate.opsForValue().set(
      refreshTokenKey,
      userId.toString(),
      Duration.ofMinutes(5),
    )
    refreshTokenKeys += refreshTokenKey

    val accessToken = jwtTokenProvider.generateAccessToken(
      userId = userId,
      role = UserRole.USER,
      tokenId = tokenId,
    )

    val receivedTokenIds = LinkedBlockingQueue<String>()
    val stompClient = WebSocketStompClient(StandardWebSocketClient()).apply {
      setMessageConverter(StringMessageConverter())
    }

    try {
      val session = stompClient.connectAsync(
        "ws://localhost:$port/ws",
        handshakeHeaders(accessToken),
        object : StompSessionHandlerAdapter() {},
      ).get(5, TimeUnit.SECONDS)

      try {
        session.subscribe(
          "/user/queue/test-authentication",
          tokenIdFrameHandler(receivedTokenIds),
        )

        session.send("/api/test-authentication", "")

        assertThat(receivedTokenIds.poll(5, TimeUnit.SECONDS))
          .isEqualTo(tokenId)
      } finally {
        session.disconnect()
      }
    } finally {
      stompClient.stop()
    }
  }

  private fun handshakeHeaders(accessToken: String) = WebSocketHttpHeaders().apply {
    add("Cookie", "access_token=$accessToken")
    add("Origin", "http://localhost:5173")
  }

  private fun tokenIdFrameHandler(receivedTokenIds: LinkedBlockingQueue<String>) = object : StompFrameHandler {
    override fun getPayloadType(headers: StompHeaders): Type = String::class.java

    override fun handleFrame(headers: StompHeaders, payload: Any?) {
      receivedTokenIds.offer(payload as String)
    }
  }
}

@TestConfiguration(proxyBeanMethods = false)
class StompAuthenticationIntegrationTestConfig {
  @Bean
  fun stompAuthenticationTestController() = StompAuthenticationTestController()
}

@Controller
class StompAuthenticationTestController {
  @MessageMapping("/test-authentication")
  @SendToUser("/queue/test-authentication")
  fun verifyAuthentication(principal: Authentication): String {
    val accessTokenPayload = principal.details
      as AccessTokenPayload

    return accessTokenPayload.tokenId
  }
}

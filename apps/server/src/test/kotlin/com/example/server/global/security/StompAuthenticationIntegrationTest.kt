package com.example.server.global.security

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.AccessTokenPayload
import com.example.server.auth.refreshTokenKey
import com.example.server.auth.types.UserRole
import com.example.server.config.TestcontainersConfig
import com.example.server.config.properties.JwtProperties
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestComponent
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.converter.StringMessageConverter
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.messaging.simp.stomp.ConnectionLostException
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompFrameHandler
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.simp.stomp.StompHeaders
import org.springframework.messaging.simp.stomp.StompSession
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.ExecutorSubscribableChannel
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Controller
import org.springframework.test.context.ActiveProfiles
import org.springframework.web.socket.WebSocketHttpHeaders
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import org.springframework.web.socket.messaging.WebSocketStompClient
import java.lang.reflect.Type
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(
  TestcontainersConfig::class,
  StompAuthenticationTestController::class,
)
class StompAuthenticationIntegrationTest {
  @LocalServerPort
  private var port = 0

  @Autowired
  lateinit var jwtTokenProvider: JwtTokenProvider

  @Autowired
  lateinit var stringRedisTemplate: StringRedisTemplate

  @Autowired
  lateinit var jwtProperties: JwtProperties

  @Autowired
  @Qualifier("clientInboundChannel")
  lateinit var clientInboundChannel: ExecutorSubscribableChannel

  @Autowired
  lateinit var testController: StompAuthenticationTestController

  private val refreshTokenKeys = mutableSetOf<String>()

  @AfterEach
  fun tearDown() {
    refreshTokenKeys.forEach(stringRedisTemplate::delete)
    refreshTokenKeys.clear()
    testController.handledTokenIds.clear()
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

  @Test
  fun `연결 후 access token이 만료되면 기존 연결의 SEND 명령을 거부한다`() {
    val tokenId = UUID.randomUUID().toString()
    val expiresAt = Instant.now()
      .truncatedTo(ChronoUnit.SECONDS)
      .plusSeconds(10)

    val accessToken = Jwts.builder()
      .id(tokenId)
      .subject("1")
      .claim("type", "ACCESS")
      .claim("role", UserRole.USER.name)
      .issuedAt(Date.from(Instant.now()))
      .expiration(Date.from(expiresAt))
      .signWith(
        Keys.hmacShaKeyFor(jwtProperties.secret.toByteArray(Charsets.UTF_8)),
      )
      .compact()

    assertCommandRejectedAfter(
      accessToken = accessToken,
      tokenId = tokenId,
      expectedMessage = "액세스 토큰이 만료되었습니다.",
    ) {
      val remainingMillis = Duration.between(
        Instant.now(),
        expiresAt,
      ).toMillis()

      if (remainingMillis >= 0) {
        Thread.sleep(remainingMillis + 50)
      }

      assertThat(Instant.now().isBefore(expiresAt)).isFalse()

      // Redis 세션은 살아 있으므로 access token 만료로 거부되어야 한다.
      assertThat(
        stringRedisTemplate.opsForValue().get(refreshTokenKey(tokenId)),
      ).isEqualTo("1")
    }
  }

  @Test
  fun `로그아웃하면 같은 인증 세션의 모든 연결을 종료하고 다른 인증 세션은 유지한다`() {
    val refreshToken = jwtTokenProvider.generateRefreshToken(1L)
    val otherRefreshToken = jwtTokenProvider.generateRefreshToken(1L)

    listOf(refreshToken.tokenId, otherRefreshToken.tokenId).forEach { tokenId ->
      val key = refreshTokenKey(tokenId)

      stringRedisTemplate.opsForValue().set(
        key,
        "1",
        Duration.ofMinutes(5),
      )
      refreshTokenKeys += key
    }

    val accessToken = jwtTokenProvider.generateAccessToken(
      userId = 1L,
      role = UserRole.USER,
      tokenId = refreshToken.tokenId,
    )
    val otherAccessToken = jwtTokenProvider.generateAccessToken(
      userId = 1L,
      role = UserRole.USER,
      tokenId = otherRefreshToken.tokenId,
    )

    val stompClient = WebSocketStompClient(StandardWebSocketClient()).apply {
      setMessageConverter(StringMessageConverter())
    }
    val connections = mutableListOf<LogoutTestConnection>()

    try {
      val first = connectForLogoutTest(stompClient, accessToken)
        .also { connections.add(it) }
      val second = connectForLogoutTest(stompClient, accessToken)
        .also { connections.add(it) }
      val other = connectForLogoutTest(stompClient, otherAccessToken)
        .also { connections.add(it) }

      // 각각 구독과 명령이 정상적으로 동작하는 것을 먼저 확인한다.
      subscribeAndVerify(first, refreshToken.tokenId)
      subscribeAndVerify(second, refreshToken.tokenId)
      subscribeAndVerify(other, otherRefreshToken.tokenId)

      connections.forEach {
        assertThat(it.session.isConnected).isTrue()
        assertThat(it.transportFailure.isDone).isFalse()
      }

      val csrfToken = UUID.randomUUID().toString()
      val request = HttpRequest.newBuilder()
        .uri(URI.create("http://localhost:$port/api/auth/logout"))
        .header(
          "Cookie",
          "refresh_token=${refreshToken.token}; XSRF-TOKEN=$csrfToken",
        )
        .header("X-XSRF-TOKEN", csrfToken)
        .POST(HttpRequest.BodyPublishers.noBody())
        .build()

      HttpClient.newHttpClient().use { httpClient ->
        val response = httpClient.send(
          request,
          HttpResponse.BodyHandlers.discarding(),
        )

        assertThat(response.statusCode()).isEqualTo(200)
      }

      // 추가 SEND 없이 서버가 두 연결을 종료해야 한다.
      listOf(first, second).forEach { connection ->
        assertThat(connection.transportFailure.get(5, TimeUnit.SECONDS))
          .isInstanceOf(ConnectionLostException::class.java)
        assertThat(connection.session.isConnected).isFalse()
      }

      assertThat(
        stringRedisTemplate.opsForValue()
          .get(refreshTokenKey(refreshToken.tokenId)),
      ).isNull()

      assertThat(
        stringRedisTemplate.opsForValue()
          .get(refreshTokenKey(otherRefreshToken.tokenId)),
      ).isEqualTo("1")

      // 같은 사용자라도 다른 로그인 세션은 계속 사용할 수 있어야 한다.
      assertThat(other.session.isConnected).isTrue()
      assertThat(other.transportFailure.isDone).isFalse()

      other.session.send("/api/test-authentication", "")

      assertThat(other.receivedTokenIds.poll(5, TimeUnit.SECONDS))
        .isEqualTo(otherRefreshToken.tokenId)
      assertThat(other.transportFailure.isDone).isFalse()
    } finally {
      try {
        connections.forEach { connection ->
          if (connection.session.isConnected) {
            connection.session.disconnect()
          }
        }
      } finally {
        stompClient.stop()
      }
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

  private fun assertCommandRejectedAfter(accessToken: String, tokenId: String, expectedMessage: String, invalidateAuthentication: () -> Unit) {
    val key = refreshTokenKey(tokenId)

    stringRedisTemplate.opsForValue().set(
      key,
      "1",
      Duration.ofMinutes(5),
    )
    refreshTokenKeys += key

    val receivedTokenIds = LinkedBlockingQueue<String>()
    val rejectedCommands = LinkedBlockingQueue<Exception>()

    // 실제 인증 interceptor 앞에서 전송 결과만 관찰한다.
    val observer = object : ChannelInterceptor {
      override fun afterSendCompletion(message: Message<*>, channel: MessageChannel, sent: Boolean, ex: Exception?) {
        val accessor = StompHeaderAccessor.wrap(message)
        val authentication = accessor.user as? Authentication
        val payload = authentication?.details as? AccessTokenPayload

        if (
          accessor.command == StompCommand.SEND &&
          payload?.tokenId == tokenId &&
          ex != null
        ) {
          rejectedCommands.offer(ex)
        }
      }
    }

    val stompClient = WebSocketStompClient(StandardWebSocketClient()).apply {
      setMessageConverter(StringMessageConverter())
    }

    clientInboundChannel.addInterceptor(0, observer)

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

        // 먼저 정상 실행을 확인해 연결·구독 실패와 인증 거부를 구분한다.
        session.send("/api/test-authentication", "")

        assertThat(receivedTokenIds.poll(5, TimeUnit.SECONDS))
          .isEqualTo(tokenId)
        assertThat(testController.handledTokenIds.count { it == tokenId })
          .isEqualTo(1)

        invalidateAuthentication()

        // 재연결하지 않고 같은 세션에서 다시 전송한다.
        assertThat(session.isConnected).isTrue()
        session.send("/api/test-authentication", "")

        val rejection = rejectedCommands.poll(5, TimeUnit.SECONDS)

        assertThat(rejection)
          .isInstanceOf(AccessDeniedException::class.java)
          .hasMessage(expectedMessage)

        // 거부된 명령은 Controller까지 도달하지 않아야 한다.
        assertThat(testController.handledTokenIds.count { it == tokenId })
          .isEqualTo(1)
      } finally {
        if (session.isConnected) {
          session.disconnect()
        }
      }
    } finally {
      clientInboundChannel.removeInterceptor(observer)
      stompClient.stop()
    }
  }

  private data class LogoutTestConnection(
    val session: StompSession,
    val receivedTokenIds: LinkedBlockingQueue<String>,
    val transportFailure: CompletableFuture<Throwable>,
  )

  private fun connectForLogoutTest(stompClient: WebSocketStompClient, accessToken: String): LogoutTestConnection {
    val transportFailure = CompletableFuture<Throwable>()

    val session = stompClient.connectAsync(
      "ws://localhost:$port/ws",
      handshakeHeaders(accessToken),
      object : StompSessionHandlerAdapter() {
        override fun handleTransportError(session: StompSession, exception: Throwable) {
          transportFailure.complete(exception)
        }
      },
    ).get(5, TimeUnit.SECONDS)

    return LogoutTestConnection(
      session = session,
      receivedTokenIds = LinkedBlockingQueue(),
      transportFailure = transportFailure,
    )
  }

  private fun subscribeAndVerify(connection: LogoutTestConnection, expectedTokenId: String) {
    connection.session.subscribe(
      "/user/queue/test-authentication",
      tokenIdFrameHandler(connection.receivedTokenIds),
    )

    connection.session.send("/api/test-authentication", "")

    assertThat(connection.receivedTokenIds.poll(5, TimeUnit.SECONDS))
      .isEqualTo(expectedTokenId)
  }
}

@TestComponent
@Controller
class StompAuthenticationTestController {
  val handledTokenIds = ConcurrentLinkedQueue<String>()

  @MessageMapping("/test-authentication")
  @SendToUser(
    value = ["/queue/test-authentication"],
    broadcast = false,
  )
  fun verifyAuthentication(principal: Authentication): String {
    val accessTokenPayload = principal.details as AccessTokenPayload

    handledTokenIds.add(accessTokenPayload.tokenId)

    return accessTokenPayload.tokenId
  }
}

package com.example.server.auth

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.dto.RefreshTokenPayload
import com.example.server.auth.types.TokenType
import com.example.server.auth.types.UserRole
import com.example.server.config.properties.JwtProperties
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class JwtTokenProviderTest {
  private lateinit var jwtProperties: JwtProperties
  private lateinit var jwtTokenProvider: JwtTokenProvider

  private val secret = "test-secret-key-test-secret-key-1234567890"

  @BeforeEach
  fun setUp() {
    jwtProperties = JwtProperties(
      secret = secret,
      accessTokenExpirationMinutes = 30L,
      refreshTokenExpirationDays = 30L,
    )

    jwtTokenProvider = JwtTokenProvider(jwtProperties)
  }

  @Nested
  inner class GenerateAccessToken {
    @Test
    fun `access token에 사용자 정보와 토큰 타입을 저장한다`() {
      val token = jwtTokenProvider.generateAccessToken(
        userId = 1L,
        role = UserRole.USER,
      )

      assertTrue(jwtTokenProvider.validateToken(token))
      assertEquals(1L, jwtTokenProvider.getUserId(token))
      assertEquals(TokenType.ACCESS, jwtTokenProvider.getTokenType(token))
      assertEquals(UserRole.USER, jwtTokenProvider.getRole(token))
    }
  }

  @Nested
  inner class GenerateRefreshToken {
    @Test
    fun `refresh token과 token id를 생성한다`() {
      val issuedToken = jwtTokenProvider.generateRefreshToken(1L)

      assertTrue(jwtTokenProvider.validateToken(issuedToken.token))
      assertEquals(1L, jwtTokenProvider.getUserId(issuedToken.token))
      assertEquals(
        TokenType.REFRESH,
        jwtTokenProvider.getTokenType(issuedToken.token),
      )
      assertEquals(
        issuedToken.tokenId,
        jwtTokenProvider.getTokenId(issuedToken.token),
      )
    }

    @Test
    fun `호출할 때마다 다른 token id를 생성한다`() {
      val first = jwtTokenProvider.generateRefreshToken(1L)
      val second = jwtTokenProvider.generateRefreshToken(1L)

      assertNotEquals(first.tokenId, second.tokenId)
      assertNotEquals(first.token, second.token)
      assertEquals(1L, jwtTokenProvider.getUserId(second.token))
      assertEquals(jwtTokenProvider.getUserId(first.token), jwtTokenProvider.getUserId(second.token))
    }
  }

  @Nested
  inner class ParseAccessToken {
    @Test
    fun `유효한 access token에서 로그인 사용자 정보를 반환한다`() {
      val token = jwtTokenProvider.generateAccessToken(
        userId = 1L,
        role = UserRole.USER,
      )

      assertEquals(
        LoginUserResult(
          userId = 1L,
          role = UserRole.USER,
        ),
        jwtTokenProvider.parseAccessToken(token),
      )
    }

    @Test
    fun `type claim이 없거나 access token이 아닌 토큰이면 null을 반환한다`() {
      val missingTypeToken = createToken(
        claims = mapOf(),
      )
      val refreshToken = jwtTokenProvider.generateRefreshToken(1L).token

      assertNull(jwtTokenProvider.parseAccessToken(missingTypeToken))
      assertNull(jwtTokenProvider.parseAccessToken(refreshToken))
    }

    @Test
    fun `유효하지 않은 토큰이면 null을 반환한다`() {
      assertNull(jwtTokenProvider.parseAccessToken(""))
      assertNull(jwtTokenProvider.parseAccessToken("invalid-token"))
    }

    @Test
    fun `사용자 ID가 숫자가 아니면 null을 반환한다`() {
      val token = createToken(
        subject = "not-number",
        claims = mapOf(
          "type" to TokenType.ACCESS.name,
          "role" to UserRole.USER.name,
        ),
      )

      assertNull(jwtTokenProvider.parseAccessToken(token))
    }

    @Test
    fun `role claim이 없거나 유효하지 않으면 null을 반환한다`() {
      val missingRoleToken = createToken(
        claims = mapOf("type" to TokenType.ACCESS.name),
      )
      val invalidRoleToken = createToken(
        claims = mapOf(
          "type" to TokenType.ACCESS.name,
          "role" to "UNKNOWN",
        ),
      )

      assertNull(jwtTokenProvider.parseAccessToken(missingRoleToken))
      assertNull(jwtTokenProvider.parseAccessToken(invalidRoleToken))
    }
  }

  @Nested
  inner class ParseRefreshToken {
    @Test
    fun `유효한 refresh token에서 사용자 ID와 token ID를 반환한다`() {
      val issuedRefreshToken = jwtTokenProvider.generateRefreshToken(1L)

      assertEquals(
        RefreshTokenPayload(
          userId = 1L,
          tokenId = issuedRefreshToken.tokenId,
        ),
        jwtTokenProvider.parseRefreshToken(issuedRefreshToken.token),
      )
    }

    @Test
    fun `access token은 refresh token으로 해석하지 않는다`() {
      val accessToken = jwtTokenProvider.generateAccessToken(
        userId = 1L,
        role = UserRole.USER,
      )

      assertEquals(null, jwtTokenProvider.parseRefreshToken(accessToken))
    }

    @Test
    fun `유효하지 않은 형식의 토큰이면 null을 반환한다`() {
      assertNull(jwtTokenProvider.parseRefreshToken(""))
      assertNull(jwtTokenProvider.parseRefreshToken("invalid-token"))
    }

    @Test
    fun `사용자 ID가 숫자가 아니면 null을 반환한다`() {
      val token = createToken(
        subject = "not-number",
        claims = mapOf("type" to TokenType.REFRESH.name),
      )

      assertNull(jwtTokenProvider.parseRefreshToken(token))
    }

    @Test
    fun `token ID가 없으면 null을 반환한다`() {
      val token = createToken(
        claims = mapOf("type" to TokenType.REFRESH.name),
      )

      assertNull(jwtTokenProvider.parseRefreshToken(token))
    }

    @Test
    fun `type claim이 없거나 refresh token이 아닌 토큰이면 null을 반환한다`() {
      val missingTypeToken = createToken()
      val accessToken = jwtTokenProvider.generateAccessToken(
        userId = 1L,
        role = UserRole.USER,
      )

      assertNull(jwtTokenProvider.parseRefreshToken(missingTypeToken))
      assertNull(jwtTokenProvider.parseRefreshToken(accessToken))
    }
  }

  @Nested
  inner class ValidateToken {
    @Test
    fun `유효한 토큰이면 true를 반환한다`() {
      val token = jwtTokenProvider.generateAccessToken(
        1L,
        UserRole.USER,
      )

      assertTrue(jwtTokenProvider.validateToken(token))
    }

    @Test
    fun `잘못된 형식의 토큰이면 false를 반환한다`() {
      assertFalse(jwtTokenProvider.validateToken("invalid-token"))
    }

    @Test
    fun `다른 키로 서명된 토큰이면 false를 반환한다`() {
      val otherKey = Keys.hmacShaKeyFor(
        "other-secret-key-other-secret-key-123456789"
          .toByteArray(StandardCharsets.UTF_8),
      )

      val token = Jwts.builder()
        .subject("1")
        .expiration(Date.from(Instant.now().plusSeconds(60)))
        .signWith(otherKey)
        .compact()

      assertFalse(jwtTokenProvider.validateToken(token))
    }

    @Test
    fun `만료된 토큰이면 false를 반환한다`() {
      val key = Keys.hmacShaKeyFor(
        secret.toByteArray(StandardCharsets.UTF_8),
      )

      val token = Jwts.builder()
        .subject("1")
        .issuedAt(Date.from(Instant.now().minusSeconds(120)))
        .expiration(Date.from(Instant.now().minusSeconds(60)))
        .signWith(key)
        .compact()

      assertFalse(jwtTokenProvider.validateToken(token))
    }

    @Test
    fun `빈 문자열이면 false를 반환한다`() {
      assertFalse(jwtTokenProvider.validateToken(""))
    }
  }

  @Nested
  inner class GetTokenType {
    @Test
    fun `type claim이 없으면 예외를 던진다`() {
      val token = createToken(
        claims = emptyMap(),
      )

      assertThrows<IllegalArgumentException> {
        jwtTokenProvider.getTokenType(token)
      }
    }

    @Test
    fun `지원하지 않는 type이면 예외를 던진다`() {
      val token = createToken(
        claims = mapOf("type" to "UNKNOWN"),
      )

      assertThrows<IllegalArgumentException> {
        jwtTokenProvider.getTokenType(token)
      }
    }
  }

  @Nested
  inner class GetRole {
    @Test
    fun `role claim이 없으면 예외를 던진다`() {
      val token = createToken(
        claims = emptyMap(),
      )

      assertThrows<IllegalArgumentException> {
        jwtTokenProvider.getRole(token)
      }
    }

    @Test
    fun `지원하지 않는 role이면 예외를 던진다`() {
      val token = createToken(
        claims = mapOf("role" to "UNKNOWN"),
      )

      assertThrows<IllegalArgumentException> {
        jwtTokenProvider.getRole(token)
      }
    }
  }

  @Nested
  inner class GetUserId {
    @Test
    fun `subject가 숫자가 아니면 예외를 던진다`() {
      val token = createToken(
        subject = "not-number",
      )

      assertThrows<NumberFormatException> {
        jwtTokenProvider.getUserId(token)
      }
    }
  }

  @Nested
  inner class GetTokenId {
    @Test
    fun `refresh token의 id를 반환한다`() {
      val issuedToken = jwtTokenProvider.generateRefreshToken(1L)

      assertEquals(
        issuedToken.tokenId,
        jwtTokenProvider.getTokenId(issuedToken.token),
      )
    }
  }

  private fun createToken(subject: String = "1", claims: Map<String, Any> = emptyMap()): String {
    val key = Keys.hmacShaKeyFor(
      secret.toByteArray(StandardCharsets.UTF_8),
    )

    val builder = Jwts.builder()
      .subject(subject)
      .issuedAt(Date.from(Instant.now()))
      .expiration(Date.from(Instant.now().plusSeconds(60)))

    claims.forEach { (name, value) ->
      builder.claim(name, value)
    }

    return builder
      .signWith(key)
      .compact()
  }
}

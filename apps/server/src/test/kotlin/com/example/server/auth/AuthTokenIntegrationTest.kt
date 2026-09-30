package com.example.server.auth

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.auth.types.UserRole
import com.example.server.config.TestcontainersConfig
import com.example.server.config.properties.JwtProperties
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.servlet.http.Cookie
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.time.Duration
import java.time.Instant
import java.util.Date

private const val CSRF_TOKEN = "test-csrf-token"
private const val REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:"

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
@Transactional
@DisplayName("인증 토큰 통합 테스트")
class AuthTokenIntegrationTest {
  @Autowired lateinit var mockMvc: MockMvc

  @Autowired lateinit var userRepository: UserRepository

  @Autowired lateinit var jwtTokenProvider: JwtTokenProvider

  @Autowired lateinit var jwtProperties: JwtProperties

  @Autowired lateinit var stringRedisTemplate: StringRedisTemplate

  private lateinit var user: User
  private val refreshTokenKeys = mutableSetOf<String>()

  @BeforeEach
  fun setUp() {
    user = userRepository.save(
      User(
        email = "auth-token-${System.nanoTime()}@example.com",
        nickname = "토큰 통합테스터",
      ),
    )
  }

  @AfterEach
  fun tearDown() {
    refreshTokenKeys.forEach(stringRedisTemplate::delete)
  }

  private fun csrfCookie() = Cookie("XSRF-TOKEN", CSRF_TOKEN)

  private fun refreshTokenKey(tokenId: String) = "$REFRESH_TOKEN_KEY_PREFIX$tokenId"

  private fun issueRefreshToken(): String {
    val issuedRefreshToken = jwtTokenProvider.generateRefreshToken(user.id)
    val key = refreshTokenKey(issuedRefreshToken.tokenId)

    stringRedisTemplate.opsForValue().set(
      key,
      user.id.toString(),
      Duration.ofDays(jwtProperties.refreshTokenExpirationDays),
    )
    refreshTokenKeys += key

    return issuedRefreshToken.token
  }

  private fun trackRefreshToken(refreshToken: String) {
    val tokenId = jwtTokenProvider.parseRefreshToken(refreshToken)!!.tokenId
    refreshTokenKeys += refreshTokenKey(tokenId)
  }

  private fun expiredAccessToken(): String = Jwts.builder()
    .subject(user.id.toString())
    .claim("type", "ACCESS")
    .claim("role", UserRole.USER.name)
    .expiration(Date.from(Instant.now().minusSeconds(60)))
    .signWith(
      Keys.hmacShaKeyFor(jwtProperties.secret.toByteArray(StandardCharsets.UTF_8)),
    )
    .compact()

  @Nested
  @DisplayName("GET /api/auth/me")
  inner class CurrentUser {
    @Test
    fun `유효한 access token으로 내 정보를 조회한다`() {
      val accessToken = jwtTokenProvider.generateAccessToken(user.id, user.role)

      mockMvc.get("/api/auth/me") {
        cookie(Cookie("access_token", accessToken))
      }.andExpect {
        status { isOk() }
        jsonPath("$.data.id") { value(user.id) }
        jsonPath("$.data.email") { value(user.email) }
      }
    }

    @Test
    fun `access token이 없으면 401을 반환한다`() {
      mockMvc.get("/api/auth/me").andExpect {
        status { isUnauthorized() }
      }
    }

    @Test
    fun `위조된 access token이면 401을 반환한다`() {
      mockMvc.get("/api/auth/me") {
        cookie(Cookie("access_token", "forged-token"))
      }.andExpect {
        status { isUnauthorized() }
      }
    }

    @Test
    fun `만료된 access token이면 401을 반환한다`() {
      mockMvc.get("/api/auth/me") {
        cookie(Cookie("access_token", expiredAccessToken()))
      }.andExpect {
        status { isUnauthorized() }
      }
    }
  }

  @Nested
  @DisplayName("POST /api/auth/refresh")
  inner class Refresh {
    @Test
    fun `유효한 refresh token으로 새 토큰을 발급하고 기존 token을 폐기한다`() {
      val oldRefreshToken = issueRefreshToken()
      val oldTokenId = jwtTokenProvider.parseRefreshToken(oldRefreshToken)!!.tokenId

      val result = mockMvc.post("/api/auth/refresh") {
        cookie(
          Cookie("refresh_token", oldRefreshToken),
          csrfCookie(),
        )
        header("X-XSRF-TOKEN", CSRF_TOKEN)
      }.andExpect {
        status { isOk() }
        cookie {
          exists("access_token")
          exists("refresh_token")
        }
      }.andReturn()

      val newRefreshToken = result.response.getCookie("refresh_token")!!.value
      val newTokenId = jwtTokenProvider.parseRefreshToken(newRefreshToken)!!.tokenId
      val newTokenKey = refreshTokenKey(newTokenId)
      refreshTokenKeys += newTokenKey

      assertThat(stringRedisTemplate.opsForValue().get(refreshTokenKey(oldTokenId))).isNull()
      assertThat(stringRedisTemplate.opsForValue().get(newTokenKey)).isEqualTo(user.id.toString())
    }

    @Test
    fun `이미 사용한 refresh token이면 401을 반환한다`() {
      val refreshToken = issueRefreshToken()

      val result = mockMvc.post("/api/auth/refresh") {
        cookie(
          Cookie("refresh_token", refreshToken),
          csrfCookie(),
        )
        header("X-XSRF-TOKEN", CSRF_TOKEN)
      }.andExpect {
        status { isOk() }
      }.andReturn()

      trackRefreshToken(result.response.getCookie("refresh_token")!!.value)

      mockMvc.post("/api/auth/refresh") {
        cookie(
          Cookie("refresh_token", refreshToken),
          csrfCookie(),
        )
        header("X-XSRF-TOKEN", CSRF_TOKEN)
      }.andExpect {
        status { isUnauthorized() }
      }
    }

    @Test
    fun `위조된 refresh token이면 401을 반환한다`() {
      mockMvc.post("/api/auth/refresh") {
        cookie(
          Cookie("refresh_token", "forged-token"),
          csrfCookie(),
        )
        header("X-XSRF-TOKEN", CSRF_TOKEN)
      }.andExpect {
        status { isUnauthorized() }
      }
    }

    @Test
    fun `refresh token 쿠키가 없으면 401을 반환한다`() {
      mockMvc.post("/api/auth/refresh") {
        cookie(csrfCookie())
        header("X-XSRF-TOKEN", CSRF_TOKEN)
      }.andExpect {
        status { isUnauthorized() }
      }
    }
  }

  @Nested
  @DisplayName("POST /api/auth/logout")
  inner class Logout {
    @Test
    fun `로그아웃하면 Redis refresh token을 삭제하고 두 인증 쿠키를 만료한다`() {
      val refreshToken = issueRefreshToken()
      val tokenId = jwtTokenProvider.parseRefreshToken(refreshToken)!!.tokenId
      val tokenKey = refreshTokenKey(tokenId)

      mockMvc.post("/api/auth/logout") {
        cookie(
          Cookie("refresh_token", refreshToken),
          csrfCookie(),
        )
        header("X-XSRF-TOKEN", CSRF_TOKEN)
      }.andExpect {
        status { isOk() }
        cookie {
          maxAge("access_token", 0)
          maxAge("refresh_token", 0)
          path("access_token", "/")
          path("refresh_token", "/api/auth")
        }
      }

      assertThat(stringRedisTemplate.opsForValue().get(tokenKey)).isNull()
    }
  }

  @Nested
  @DisplayName("CSRF 검증")
  inner class Csrf {
    @Test
    fun `CSRF 토큰 없이 refresh 요청하면 403을 반환한다`() {
      mockMvc.post("/api/auth/refresh") {
        cookie(Cookie("refresh_token", issueRefreshToken()))
      }.andExpect {
        status { isForbidden() }
      }
    }

    @Test
    fun `CSRF 토큰 없이 logout 요청하면 403을 반환한다`() {
      mockMvc.post("/api/auth/logout") {
        cookie(Cookie("refresh_token", issueRefreshToken()))
      }.andExpect {
        status { isForbidden() }
      }
    }
  }
}

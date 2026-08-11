package com.example.server.auth

import com.example.server.auth.dto.OAuthStateData
import com.example.server.auth.entity.User
import com.example.server.auth.repository.OAuthAccountRepository
import com.example.server.auth.repository.UserRepository
import com.example.server.auth.types.OAuthErrorCode
import com.example.server.auth.types.OAuthProvider
import com.example.server.config.TestcontainersConfig
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.restclient.test.autoconfigure.AutoConfigureMockRestServiceServer
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withServerError
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.MvcResult
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.util.UriComponentsBuilder
import java.time.Duration

private const val OAUTH_STATE_KEY_PREFIX = "oauth:state:"
private const val REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:"
private const val GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"
private const val GOOGLE_USER_INFO_URI = "https://openidconnect.googleapis.com/v1/userinfo"

@SpringBootTest
@AutoConfigureMockMvc
@AutoConfigureMockRestServiceServer
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
@Transactional
@DisplayName("OAuth 인증 통합 테스트")
class OAuthIntegrationTest {
  @Autowired lateinit var mockMvc: MockMvc

  @Autowired lateinit var mockServer: MockRestServiceServer

  @Autowired lateinit var userRepository: UserRepository

  @Autowired lateinit var oauthAccountRepository: OAuthAccountRepository

  @Autowired lateinit var oauthStateRedisTemplate: RedisTemplate<String, OAuthStateData>

  @Autowired lateinit var stringRedisTemplate: StringRedisTemplate

  @Autowired lateinit var jwtTokenProvider: JwtTokenProvider

  private val oauthStateKeys = mutableSetOf<String>()
  private val refreshTokenKeys = mutableSetOf<String>()

  @AfterEach
  fun tearDown() {
    oauthStateKeys.forEach(oauthStateRedisTemplate::delete)
    refreshTokenKeys.forEach(stringRedisTemplate::delete)
    mockServer.reset()
  }

  private fun oauthStateKey(state: String) = "$OAUTH_STATE_KEY_PREFIX$state"

  private fun saveOAuthState(state: String, provider: OAuthProvider = OAuthProvider.GOOGLE, redirectUri: String = "/dashboard") {
    val key = oauthStateKey(state)

    oauthStateRedisTemplate.opsForValue().set(
      key,
      OAuthStateData(provider, redirectUri),
      Duration.ofMinutes(10),
    )
    oauthStateKeys += key
  }

  private fun startOAuth(redirectUri: String = "/dashboard"): String {
    val result = mockMvc.get("/api/auth/oauth/google") {
      param("redirect_uri", redirectUri)
    }.andExpect {
      status { isFound() }
    }.andReturn()

    val authorizationUri = UriComponentsBuilder
      .fromUriString(result.response.redirectedUrl!!)
      .build()

    val state = authorizationUri.queryParams.getFirst("state")!!
    oauthStateKeys += oauthStateKey(state)

    assertThat(authorizationUri.toUriString())
      .startsWith("https://accounts.google.com/o/oauth2/v2/auth")
    assertThat(authorizationUri.queryParams.getFirst("redirect_uri"))
      .isEqualTo("http://localhost:8080/api/auth/oauth/google/callback")
    assertThat(oauthStateRedisTemplate.opsForValue().get(oauthStateKey(state)))
      .isEqualTo(OAuthStateData(OAuthProvider.GOOGLE, redirectUri))

    return state
  }

  private fun callback(state: String? = null, code: String? = null, error: String? = null): MvcResult =
    mockMvc.get("/api/auth/oauth/google/callback") {
      state?.let { param("state", it) }
      code?.let { param("code", it) }
      error?.let { param("error", it) }
    }.andExpect {
      status { isFound() }
    }.andReturn()

  private fun assertErrorRedirect(result: MvcResult, errorCode: OAuthErrorCode) {
    assertThat(result.response.redirectedUrl)
      .isEqualTo("http://localhost:5173/login?error_code=${errorCode.name}")
  }

  private fun expectGoogleTokenSuccess() {
    mockServer.expect(requestTo(GOOGLE_TOKEN_URI))
      .andExpect(method(HttpMethod.POST))
      .andRespond(
        withSuccess(
          """{"access_token":"provider-access-token"}""",
          MediaType.APPLICATION_JSON,
        ),
      )
  }

  private fun expectGoogleUserInfoSuccess(providerUserId: String, email: String) {
    mockServer.expect(requestTo(GOOGLE_USER_INFO_URI))
      .andExpect(method(HttpMethod.GET))
      .andRespond(
        withSuccess(
          """
          {
            "sub": "$providerUserId",
            "email": "$email",
            "name": "OAuth 통합테스터",
            "picture": "https://example.com/profile.png"
          }
          """.trimIndent(),
          MediaType.APPLICATION_JSON,
        ),
      )
  }

  @Nested
  inner class AuthorizationStart {
    @Test
    fun `OAuth 인증 시작 시 state를 Redis에 저장하고 provider로 리다이렉트한다`() {
      startOAuth()
    }

    @Test
    fun `유효하지 않은 redirect URI면 400을 반환한다`() {
      mockMvc.get("/api/auth/oauth/google") {
        param("redirect_uri", "//evil.example.com")
      }.andExpect {
        status { isBadRequest() }
      }
    }

    @Test
    fun `지원하지 않는 provider면 400을 반환한다`() {
      mockMvc.get("/api/auth/oauth/unknown") {
        param("redirect_uri", "/dashboard")
      }.andExpect {
        status { isBadRequest() }
      }
    }
  }

  @Nested
  inner class CallbackFailure {
    @Test
    fun `state가 없으면 OAUTH_STATE_MISSING으로 리다이렉트한다`() {
      assertErrorRedirect(
        callback(code = "authorization-code"),
        OAuthErrorCode.OAUTH_STATE_MISSING,
      )
    }

    @Test
    fun `provider가 인증을 거절하면 state를 삭제하고 OAUTH_ACCESS_DENIED로 리다이렉트한다`() {
      val state = "denied-state"
      saveOAuthState(state)

      assertErrorRedirect(
        callback(state = state, error = "access_denied"),
        OAuthErrorCode.OAUTH_ACCESS_DENIED,
      )

      assertThat(oauthStateRedisTemplate.opsForValue().get(oauthStateKey(state))).isNull()
    }

    @Test
    fun `code가 없으면 state를 삭제하고 OAUTH_ACCESS_DENIED로 리다이렉트한다`() {
      val state = "missing-code-state"
      saveOAuthState(state)

      assertErrorRedirect(
        callback(state = state),
        OAuthErrorCode.OAUTH_ACCESS_DENIED,
      )

      assertThat(oauthStateRedisTemplate.opsForValue().get(oauthStateKey(state))).isNull()
    }

    @Test
    fun `Redis state가 없으면 OAUTH_STATE_EXPIRED로 리다이렉트한다`() {
      assertErrorRedirect(
        callback(state = "expired-state", code = "authorization-code"),
        OAuthErrorCode.OAUTH_STATE_EXPIRED,
      )
    }

    @Test
    fun `state의 provider가 callback provider와 다르면 OAUTH_STATE_MISMATCH로 리다이렉트한다`() {
      val state = "provider-mismatch-state"
      saveOAuthState(
        state = state,
        provider = OAuthProvider.KAKAO,
      )

      assertErrorRedirect(
        callback(state = state, code = "authorization-code"),
        OAuthErrorCode.OAUTH_STATE_MISMATCH,
      )
    }

    @Test
    fun `provider token API가 실패하면 OAUTH_CODE_EXCHANGE_FAILED로 리다이렉트한다`() {
      val state = startOAuth()

      mockServer.expect(requestTo(GOOGLE_TOKEN_URI))
        .andExpect(method(HttpMethod.POST))
        .andRespond(withServerError())

      assertErrorRedirect(
        callback(state = state, code = "authorization-code"),
        OAuthErrorCode.OAUTH_CODE_EXCHANGE_FAILED,
      )

      mockServer.verify()
    }

    @Test
    fun `provider user-info API가 실패하면 OAUTH_PROFILE_FETCH_FAILED로 리다이렉트한다`() {
      val state = startOAuth()
      expectGoogleTokenSuccess()

      mockServer.expect(requestTo(GOOGLE_USER_INFO_URI))
        .andExpect(method(HttpMethod.GET))
        .andRespond(withServerError())

      assertErrorRedirect(
        callback(state = state, code = "authorization-code"),
        OAuthErrorCode.OAUTH_PROFILE_FETCH_FAILED,
      )

      mockServer.verify()
    }

    @Test
    fun `기존 이메일이 다른 OAuth 계정에 연결돼 있으면 OAUTH_ACCOUNT_CONFLICT로 리다이렉트한다`() {
      val email = "conflict@example.com"
      userRepository.save(
        User(
          email = email,
          nickname = "기존 사용자",
        ),
      )

      val state = startOAuth()
      expectGoogleTokenSuccess()
      expectGoogleUserInfoSuccess(
        providerUserId = "conflict-google-id",
        email = email,
      )

      assertErrorRedirect(
        callback(state = state, code = "authorization-code"),
        OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT,
      )

      mockServer.verify()
    }
  }

  @Nested
  inner class CallbackSuccess {
    @Test
    fun `OAuth 시작부터 callback까지 사용자 저장과 인증 쿠키 발급을 완료한다`() {
      val email = "oauth-integration@example.com"
      val providerUserId = "google-user-id"
      val state = startOAuth()

      expectGoogleTokenSuccess()
      expectGoogleUserInfoSuccess(
        providerUserId = providerUserId,
        email = email,
      )

      val result = callback(
        state = state,
        code = "authorization-code",
      )

      mockServer.verify()

      val accessToken = result.response.getCookie("access_token")!!.value
      val refreshToken = result.response.getCookie("refresh_token")!!.value
      val refreshTokenId = jwtTokenProvider.parseRefreshToken(refreshToken)!!.tokenId
      val refreshTokenKey = "$REFRESH_TOKEN_KEY_PREFIX$refreshTokenId"
      refreshTokenKeys += refreshTokenKey

      val user = userRepository.findByEmail(email)
      val oauthAccount = oauthAccountRepository
        .findByProviderAndProviderUserId(OAuthProvider.GOOGLE, providerUserId)

      assertThat(result.response.redirectedUrl)
        .isEqualTo("http://localhost:5173/dashboard")
      assertThat(jwtTokenProvider.parseAccessToken(accessToken)).isNotNull()
      assertThat(user).isNotNull
      assertThat(oauthAccount).isNotNull
      assertThat(oauthAccount?.user?.id).isEqualTo(user?.id)
      assertThat(stringRedisTemplate.opsForValue().get(refreshTokenKey))
        .isEqualTo(user!!.id.toString())
      assertThat(oauthStateRedisTemplate.opsForValue().get(oauthStateKey(state))).isNull()
    }

    @Test
    fun `이미 사용한 state로 callback을 재시도하면 OAUTH_STATE_EXPIRED로 리다이렉트한다`() {
      val state = startOAuth()

      expectGoogleTokenSuccess()
      expectGoogleUserInfoSuccess(
        providerUserId = "reused-state-user-id",
        email = "reused-state@example.com",
      )

      callback(state = state, code = "authorization-code")
      mockServer.verify()
      mockServer.reset()

      assertErrorRedirect(
        callback(state = state, code = "authorization-code"),
        OAuthErrorCode.OAUTH_STATE_EXPIRED,
      )
    }
  }
}

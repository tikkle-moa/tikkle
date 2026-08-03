package com.example.server.auth

import com.example.server.auth.dto.CallbackResult
import com.example.server.auth.dto.IssuedRefreshToken
import com.example.server.auth.dto.OAuthStateData
import com.example.server.auth.dto.OAuthUserInfo
import com.example.server.auth.entity.User
import com.example.server.auth.types.OAuthErrorCode
import com.example.server.auth.types.OAuthProvider
import com.example.server.auth.types.UserRole
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.config.properties.OAuthProperties
import com.example.server.global.exception.CustomException
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

  @Mock
  lateinit var oauthProperties: OAuthProperties

  @Mock
  lateinit var appProperties: AppProperties

  @Mock
  lateinit var jwtProperties: JwtProperties

  @Mock
  lateinit var jwtTokenProvider: JwtTokenProvider

  @Mock
  lateinit var oauthStateRedisTemplate: RedisTemplate<String, OAuthStateData>

  @Mock
  lateinit var oauthStateValueOperations: ValueOperations<String, OAuthStateData>

  @Mock
  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock
  lateinit var stringValueOperations: ValueOperations<String, String>

  @Mock
  lateinit var authTransactionService: AuthTransactionService

  private lateinit var service: AuthService
  private lateinit var mockServer: MockRestServiceServer

  private val googleConfig = OAuthProperties.ProviderConfig(
    clientId = "google-client-id",
    clientSecret = "google-client-secret",
    authorizationUri = "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUri = "https://oauth2.googleapis.com/token",
    userInfoUri = "https://openidconnect.googleapis.com/v1/userinfo",
    scope = "openid email profile",
  )

  private val testCode = "test-code"
  private val testState = "test-state"

  @BeforeEach
  fun setUp() {
    val restClientBuilder = RestClient.builder()
    mockServer = MockRestServiceServer
      .bindTo(restClientBuilder)
      .build()

    service = AuthService(
      oauthProperties = oauthProperties,
      appProperties = appProperties,
      jwtProperties = jwtProperties,
      jwtTokenProvider = jwtTokenProvider,
      oauthStateRedisTemplate = oauthStateRedisTemplate,
      stringRedisTemplate = stringRedisTemplate,
      authTransactionService = authTransactionService,
      restClientBuilder = restClientBuilder,
    )
  }

  @Nested
  @DisplayName("getAuthorizationUrl")
  inner class GetAuthorizationUrl {
    @Test
    fun `유효하지 않은 redirect URI이면 예외를 던진다`() {
      assertThrows<CustomException> {
        service.getAuthorizationUrl(
          OAuthProvider.GOOGLE,
          "https://evil.example.com",
        )
      }

      then(oauthStateRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `설정이 없는 provider이면 예외를 던진다`() {
      given(oauthProperties.providers).willReturn(emptyMap())

      assertThrows<CustomException> {
        service.getAuthorizationUrl(
          OAuthProvider.GOOGLE,
          "/dashboard",
        )
      }

      then(oauthStateRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `OAuth state를 저장하고 인증 URL을 반환한다`() {
      given(oauthProperties.providers)
        .willReturn(mapOf(OAuthProvider.GOOGLE.value to googleConfig))
      given(appProperties.baseUrl)
        .willReturn("http://localhost:8080")
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)

      val result = service.getAuthorizationUrl(
        OAuthProvider.GOOGLE,
        "/dashboard",
      )

      assertTrue(
        result.startsWith(
          "https://accounts.google.com/o/oauth2/v2/auth",
        ),
      )
      assertTrue(result.contains("client_id=google-client-id"))
      assertTrue(
        result.contains(
          "redirect_uri=http://localhost:8080/api/auth/oauth/google/callback",
        ),
      )
      assertTrue(result.contains("response_type=code"))
      assertTrue(result.contains("scope=openid%20email%20profile"))
      assertTrue(result.contains("state="))

      then(oauthStateValueOperations)
        .should()
        .set(
          anyString(),
          any(OAuthStateData::class.java),
          any(Duration::class.java),
        )
    }
  }

  @Nested
  @DisplayName("handleCallback")
  inner class HandleCallback {
    @Test
    fun `state가 만료되었으면 OAUTH_STATE_EXPIRED를 반환한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(null)

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Failure(
          OAuthErrorCode.OAUTH_STATE_EXPIRED,
        ),
        result,
      )

      then(authTransactionService).shouldHaveNoInteractions()
      then(jwtTokenProvider).shouldHaveNoInteractions()
      then(stringRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `provider가 state와 다르면 OAUTH_STATE_MISMATCH를 반환한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(
        OAuthStateData(
          provider = OAuthProvider.KAKAO,
          redirectUri = "/dashboard",
        ),
      )

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Failure(
          OAuthErrorCode.OAUTH_STATE_MISMATCH,
        ),
        result,
      )

      then(authTransactionService).shouldHaveNoInteractions()
      then(jwtTokenProvider).shouldHaveNoInteractions()
      then(stringRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `provider 설정이 없으면 코드 교환 실패를 반환한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(
        OAuthStateData(
          provider = OAuthProvider.GOOGLE,
          redirectUri = "/dashboard",
        ),
      )
      given(oauthProperties.providers).willReturn(emptyMap())

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Failure(
          OAuthErrorCode.OAUTH_CODE_EXCHANGE_FAILED,
        ),
        result,
      )

      then(authTransactionService).shouldHaveNoInteractions()
      then(jwtTokenProvider).shouldHaveNoInteractions()
      then(stringRedisTemplate).shouldHaveNoInteractions()
    }

    @Test
    fun `토큰 교환 응답에 access token이 없으면 OAUTH_CODE_EXCHANGE_FAILED를 반환한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(
        OAuthStateData(
          provider = OAuthProvider.GOOGLE,
          redirectUri = "/dashboard",
        ),
      )
      given(oauthProperties.providers)
        .willReturn(mapOf(OAuthProvider.GOOGLE.value to googleConfig))
      given(appProperties.baseUrl)
        .willReturn("http://localhost:8080")

      mockServer.expect(requestTo(googleConfig.tokenUri))
        .andExpect(method(HttpMethod.POST))
        .andRespond(
          withSuccess(
            """{"token_type":"Bearer"}""",
            MediaType.APPLICATION_JSON,
          ),
        )

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Failure(
          OAuthErrorCode.OAUTH_CODE_EXCHANGE_FAILED,
        ),
        result,
      )

      then(authTransactionService).shouldHaveNoInteractions()
      then(jwtTokenProvider).shouldHaveNoInteractions()
      then(stringRedisTemplate).shouldHaveNoInteractions()
      mockServer.verify()
    }

    @Test
    fun `사용자 정보 응답이 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(
        OAuthStateData(
          provider = OAuthProvider.GOOGLE,
          redirectUri = "/dashboard",
        ),
      )
      given(oauthProperties.providers)
        .willReturn(mapOf(OAuthProvider.GOOGLE.value to googleConfig))
      given(appProperties.baseUrl)
        .willReturn("http://localhost:8080")

      mockServer.expect(requestTo(googleConfig.tokenUri))
        .andExpect(method(HttpMethod.POST))
        .andRespond(
          withSuccess(
            """{"access_token":"oauth-access-token"}""",
            MediaType.APPLICATION_JSON,
          ),
        )

      mockServer.expect(requestTo(googleConfig.userInfoUri))
        .andExpect(method(HttpMethod.GET))
        .andRespond(
          withSuccess(
            """{"email":"test@example.com"}""",
            MediaType.APPLICATION_JSON,
          ),
        )

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Failure(
          OAuthErrorCode.OAUTH_PROFILE_FETCH_FAILED,
        ),
        result,
      )

      then(authTransactionService).shouldHaveNoInteractions()
      then(jwtTokenProvider).shouldHaveNoInteractions()
      then(stringRedisTemplate).shouldHaveNoInteractions()
      mockServer.verify()
    }

    @Test
    fun `사용자 계정이 충돌하면 OAUTH_ACCOUNT_CONFLICT를 반환한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(
        OAuthStateData(
          provider = OAuthProvider.GOOGLE,
          redirectUri = "/dashboard",
        ),
      )
      given(oauthProperties.providers)
        .willReturn(mapOf(OAuthProvider.GOOGLE.value to googleConfig))
      given(appProperties.baseUrl)
        .willReturn("http://localhost:8080")

      mockServer.expect(requestTo(googleConfig.tokenUri))
        .andRespond(
          withSuccess(
            """{"access_token":"oauth-access-token"}""",
            MediaType.APPLICATION_JSON,
          ),
        )

      mockServer.expect(requestTo(googleConfig.userInfoUri))
        .andRespond(
          withSuccess(
            """
            {
              "sub": "google-123",
              "email": "test@example.com",
              "name": "테스터",
              "picture": null
            }
            """.trimIndent(),
            MediaType.APPLICATION_JSON,
          ),
        )

      given(
        authTransactionService.loginUser(
          any(OAuthUserInfo::class.java),
        ),
      ).willReturn(null)

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Failure(
          OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT,
        ),
        result,
      )

      then(jwtTokenProvider).shouldHaveNoInteractions()
      then(stringRedisTemplate).shouldHaveNoInteractions()
      mockServer.verify()
    }

    @Test
    fun `콜백 처리에 성공하면 서비스 토큰을 발급하고 refresh token을 저장한다`() {
      given(oauthStateRedisTemplate.opsForValue())
        .willReturn(oauthStateValueOperations)
      given(
        oauthStateValueOperations.getAndDelete(
          "oauth:state:$testState",
        ),
      ).willReturn(
        OAuthStateData(
          provider = OAuthProvider.GOOGLE,
          redirectUri = "/dashboard",
        ),
      )
      given(oauthProperties.providers)
        .willReturn(mapOf(OAuthProvider.GOOGLE.value to googleConfig))
      given(appProperties.baseUrl)
        .willReturn("http://localhost:8080")

      mockServer.expect(requestTo(googleConfig.tokenUri))
        .andExpect(method(HttpMethod.POST))
        .andRespond(
          withSuccess(
            """{"access_token":"oauth-access-token"}""",
            MediaType.APPLICATION_JSON,
          ),
        )

      mockServer.expect(requestTo(googleConfig.userInfoUri))
        .andExpect(method(HttpMethod.GET))
        .andRespond(
          withSuccess(
            """
            {
              "sub": "google-123",
              "email": "test@example.com",
              "name": "테스터",
              "picture": "https://example.com/profile.png"
            }
            """.trimIndent(),
            MediaType.APPLICATION_JSON,
          ),
        )

      val user = User(
        id = 1L,
        email = "test@example.com",
        nickname = "테스터",
        role = UserRole.USER,
      )

      given(
        authTransactionService.loginUser(
          any(OAuthUserInfo::class.java),
        ),
      ).willReturn(user)

      val testAccessToken = "test-access-token"
      val testRefreshTokenId = "test-refresh-token-id"
      val testRefreshToken = "test-refresh-token"
      given(
        jwtTokenProvider.generateAccessToken(
          user.id,
          user.role,
        ),
      ).willReturn(testAccessToken)
      given(
        jwtTokenProvider.generateRefreshToken(user.id),
      ).willReturn(
        IssuedRefreshToken(
          tokenId = testRefreshTokenId,
          token = testRefreshToken,
        ),
      )
      given(jwtProperties.refreshTokenExpirationDays)
        .willReturn(30L)
      given(stringRedisTemplate.opsForValue())
        .willReturn(stringValueOperations)

      val result = service.handleCallback(
        OAuthProvider.GOOGLE,
        testCode,
        testState,
      )

      assertEquals(
        CallbackResult.Success(
          accessToken = testAccessToken,
          refreshToken = testRefreshToken,
          redirectUri = "/dashboard",
        ),
        result,
      )

      then(stringValueOperations)
        .should()
        .set(
          "auth:refresh:$testRefreshTokenId",
          user.id.toString(),
          Duration.ofDays(30),
        )

      mockServer.verify()
    }
  }

  @Nested
  @DisplayName("deleteOAuthState")
  inner class DeleteOAuthState {

    @Test
    fun `state에 해당하는 Redis 데이터를 삭제한다`() {
      service.deleteOAuthState(testState)

      then(oauthStateRedisTemplate)
        .should()
        .delete("oauth:state:$testState")
    }
  }

  private fun <T> any(type: Class<T>): T = org.mockito.ArgumentMatchers.any(type)
}

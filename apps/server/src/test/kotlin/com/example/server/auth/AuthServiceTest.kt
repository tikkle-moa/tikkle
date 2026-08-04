package com.example.server.auth

import com.example.server.auth.dto.CallbackResult
import com.example.server.auth.dto.IssuedRefreshToken
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.dto.OAuthStateData
import com.example.server.auth.dto.OAuthUserInfo
import com.example.server.auth.repository.OAuthAccountRepository
import com.example.server.auth.repository.UserRepository
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
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.Mockito.mockingDetails
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withServerError
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import java.time.Duration
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@ExtendWith(MockitoExtension::class)
class AuthServiceTest {

  @Mock
  lateinit var userRepository: UserRepository

  @Mock
  lateinit var oauthAccountRepository: OAuthAccountRepository

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

  private val kakaoConfig = OAuthProperties.ProviderConfig(
    clientId = "kakao-client-id",
    clientSecret = "kakao-client-secret",
    authorizationUri = "https://kauth.kakao.com/oauth/authorize",
    tokenUri = "https://kauth.kakao.com/oauth/token",
    userInfoUri = "https://kapi.kakao.com/v2/user/me",
    scope = "account_email profile_nickname",
  )

  private val naverConfig = OAuthProperties.ProviderConfig(
    clientId = "naver-client-id",
    clientSecret = "naver-client-secret",
    authorizationUri = "https://nid.naver.com/oauth2.0/authorize",
    tokenUri = "https://nid.naver.com/oauth2.0/token",
    userInfoUri = "https://openapi.naver.com/v1/nid/me",
    scope = "name email",
  )

  private val githubConfig = OAuthProperties.ProviderConfig(
    clientId = "github-client-id",
    clientSecret = "github-client-secret",
    authorizationUri = "https://github.com/login/oauth/authorize",
    tokenUri = "https://github.com/login/oauth/access_token",
    userInfoUri = "https://api.github.com/user",
    scope = "read:user user:email",
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
      userRepository = userRepository,
      oauthAccountRepository = oauthAccountRepository,
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
    @ParameterizedTest
    @ValueSource(
      strings = [
        "//evil.example.com",
        "/path\\evil",
        "/https://evil.example.com",
        "",
        "dashboard",
      ],
    )
    fun `유효하지 않은 redirect URI이면 예외를 던진다`(redirectUri: String) {
      assertThrows<CustomException> {
        service.getAuthorizationUrl(
          OAuthProvider.GOOGLE,
          redirectUri,
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
    fun `토큰 교환 응답이 에러가 나오면 OAUTH_CODE_EXCHANGE_FAILED를 반환한다`() {
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
          withServerError(),
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
    fun `사용자 정보 응답이 에러가 나오면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`() {
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
          withServerError(),
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

    @Nested
    @DisplayName("사용자 정보 파싱 테스트")
    inner class UserInfoResponseTests {
      @Nested
      @DisplayName("Kakao 사용자 정보 파싱 테스트")
      inner class KakaoUserInfoResponseTests {
        @ParameterizedTest
        @ValueSource(
          strings = [
            """{}""",
            """{"kakao_account": {}}""",
            """{"kakao_account": {"email": "test@example.com"}}""",
            """{"kakao_account": {"email": "test@example.com", "profile": {}}}""",
            """{"kakao_account": {"email": "test@example.com", "profile": {"nickname": "테스터"}}}""",
          ],
        )
        fun `사용자 정보 응답이 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`(userInfoBody: String) {
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
          given(oauthProperties.providers)
            .willReturn(mapOf(OAuthProvider.KAKAO.value to kakaoConfig))
          given(appProperties.baseUrl)
            .willReturn("http://localhost:8080")

          mockServer.expect(requestTo(kakaoConfig.tokenUri))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
              withSuccess(
                """{"access_token":"oauth-access-token"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo(kakaoConfig.userInfoUri))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                userInfoBody,
                MediaType.APPLICATION_JSON,
              ),
            )

          val result = service.handleCallback(
            OAuthProvider.KAKAO,
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
        fun `Kakao 사용자 정보를 올바르게 파싱한다`() {
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
          given(oauthProperties.providers)
            .willReturn(mapOf(OAuthProvider.KAKAO.value to kakaoConfig))
          given(appProperties.baseUrl)
            .willReturn("http://localhost:8080")

          mockServer.expect(requestTo(kakaoConfig.tokenUri))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
              withSuccess(
                """{"access_token":"oauth-access-token"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo(kakaoConfig.userInfoUri))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                """{"id": "kakao-123", "kakao_account": {"email":"test@example.com", "profile": {"nickname": "테스터", "profile_image_url": "https://example.com/profile.png"}}}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          given(
            authTransactionService.loginUser(
              any(OAuthUserInfo::class.java),
            ),
          ).willReturn(null)

          val result = service.handleCallback(
            OAuthProvider.KAKAO,
            testCode,
            testState,
          )

          val invocation = mockingDetails(authTransactionService)
            .invocations
            .single { it.method.name == "loginUser" }

          val actualUserInfo = invocation.arguments[0] as OAuthUserInfo

          assertEquals(
            OAuthUserInfo(
              email = "test@example.com",
              nickname = "테스터",
              profileImageUrl = "https://example.com/profile.png",
              provider = OAuthProvider.KAKAO,
              providerUserId = "kakao-123",
            ),
            actualUserInfo,
          )

          assertEquals(
            CallbackResult.Failure(
              OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT,
            ),
            result,
          )

          mockServer.verify()
        }
      }

      @Nested
      @DisplayName("Google 사용자 정보 파싱 테스트")
      inner class GoogleUserInfoResponseTests {
        @ParameterizedTest
        @ValueSource(
          strings = [
            """{}""",
            """{"email":"test@example.com"}""",
            """{"email":"test@example.com", "name":"테스터"}""",
          ],
        )
        fun `사용자 정보 응답이 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`(userInfoBody: String) {
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
                userInfoBody,
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
        fun `Google 사용자 정보를 올바르게 파싱한다`() {
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
                """{"sub": "google-123", "email":"test@example.com", "name":"테스터", "picture":"https://example.com/profile.png"}""",
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

          val invocation = mockingDetails(authTransactionService)
            .invocations
            .single { it.method.name == "loginUser" }

          val actualUserInfo = invocation.arguments[0] as OAuthUserInfo

          assertEquals(
            OAuthUserInfo(
              email = "test@example.com",
              nickname = "테스터",
              profileImageUrl = "https://example.com/profile.png",
              provider = OAuthProvider.GOOGLE,
              providerUserId = "google-123",
            ),
            actualUserInfo,
          )

          assertEquals(
            CallbackResult.Failure(
              OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT,
            ),
            result,
          )

          mockServer.verify()
        }
      }

      @Nested
      @DisplayName("Naver 사용자 정보 파싱 테스트")
      inner class NaverUserInfoResponseTests {
        @ParameterizedTest
        @ValueSource(
          strings = [
            """{}""",
            """{"response": {}}""",
            """{"response": {"email":"test@example.com"}}""",
            """{"response": {"email":"test@example.com", "name":"테스터"}}""",
          ],
        )
        fun `사용자 정보 응답이 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`(userInfoBody: String) {
          given(oauthStateRedisTemplate.opsForValue())
            .willReturn(oauthStateValueOperations)
          given(
            oauthStateValueOperations.getAndDelete(
              "oauth:state:$testState",
            ),
          ).willReturn(
            OAuthStateData(
              provider = OAuthProvider.NAVER,
              redirectUri = "/dashboard",
            ),
          )
          given(oauthProperties.providers)
            .willReturn(mapOf(OAuthProvider.NAVER.value to naverConfig))
          given(appProperties.baseUrl)
            .willReturn("http://localhost:8080")

          mockServer.expect(requestTo(naverConfig.tokenUri))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
              withSuccess(
                """{"access_token":"oauth-access-token"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo(naverConfig.userInfoUri))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                userInfoBody,
                MediaType.APPLICATION_JSON,
              ),
            )

          val result = service.handleCallback(
            OAuthProvider.NAVER,
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
        fun `Naver 사용자 정보를 올바르게 파싱한다`() {
          given(oauthStateRedisTemplate.opsForValue())
            .willReturn(oauthStateValueOperations)
          given(
            oauthStateValueOperations.getAndDelete(
              "oauth:state:$testState",
            ),
          ).willReturn(
            OAuthStateData(
              provider = OAuthProvider.NAVER,
              redirectUri = "/dashboard",
            ),
          )
          given(oauthProperties.providers)
            .willReturn(mapOf(OAuthProvider.NAVER.value to naverConfig))
          given(appProperties.baseUrl)
            .willReturn("http://localhost:8080")

          mockServer.expect(requestTo(naverConfig.tokenUri))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
              withSuccess(
                """{"access_token":"oauth-access-token"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo(naverConfig.userInfoUri))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                """{"response": {"id": "naver-123", "email":"test@example.com", "name":"테스터", "profile_image":"https://example.com/profile.png"}}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          given(
            authTransactionService.loginUser(
              any(OAuthUserInfo::class.java),
            ),
          ).willReturn(null)

          val result = service.handleCallback(
            OAuthProvider.NAVER,
            testCode,
            testState,
          )

          val invocation = mockingDetails(authTransactionService)
            .invocations
            .single { it.method.name == "loginUser" }

          val actualUserInfo = invocation.arguments[0] as OAuthUserInfo

          assertEquals(
            OAuthUserInfo(
              email = "test@example.com",
              nickname = "테스터",
              profileImageUrl = "https://example.com/profile.png",
              provider = OAuthProvider.NAVER,
              providerUserId = "naver-123",
            ),
            actualUserInfo,
          )

          assertEquals(
            CallbackResult.Failure(
              OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT,
            ),
            result,
          )

          mockServer.verify()
        }
      }

      @Nested
      @DisplayName("Github 사용자 정보 파싱 테스트")
      inner class GithubUserInfoResponseTests {
        @Nested
        @DisplayName("email 정보가 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다")
        inner class GithubEmailResponseTests {
          @ParameterizedTest
          @ValueSource(
            strings = [
              "",
              """[]""",
              """[{"email": "test@example.com", "primary": false, "verified": false}]""",
              """[{"email": "test@example.com", "primary": false, "verified": true}]""",
              """[{"email": "test@example.com", "primary": true, "verified": false}]""",
              """[{"email": 123, "primary": true, "verified": true}]""",
            ],
          )
          fun `Github 이메일 정보가 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`(emailResponse: String) {
            given(oauthStateRedisTemplate.opsForValue())
              .willReturn(oauthStateValueOperations)
            given(
              oauthStateValueOperations.getAndDelete(
                "oauth:state:$testState",
              ),
            ).willReturn(
              OAuthStateData(
                provider = OAuthProvider.GITHUB,
                redirectUri = "/dashboard",
              ),
            )
            given(oauthProperties.providers)
              .willReturn(mapOf(OAuthProvider.GITHUB.value to githubConfig))
            given(appProperties.baseUrl)
              .willReturn("http://localhost:8080")

            mockServer.expect(requestTo(githubConfig.tokenUri))
              .andExpect(method(HttpMethod.POST))
              .andRespond(
                withSuccess(
                  """{"access_token":"oauth-access-token"}""",
                  MediaType.APPLICATION_JSON,
                ),
              )

            mockServer.expect(requestTo(githubConfig.userInfoUri))
              .andExpect(method(HttpMethod.GET))
              .andRespond(
                withSuccess(
                  """{}""",
                  MediaType.APPLICATION_JSON,
                ),
              )

            mockServer.expect(requestTo("https://api.github.com/user/emails"))
              .andExpect(method(HttpMethod.GET))
              .andRespond(
                if (emailResponse.isNotEmpty()) {
                  withSuccess(
                    emailResponse,
                    MediaType.APPLICATION_JSON,
                  )
                } else {
                  withServerError()
                },
              )

            val result = service.handleCallback(
              OAuthProvider.GITHUB,
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
        }

        @ParameterizedTest
        @ValueSource(
          strings = [
            """{"email": "test@example.com"}""",
            """{"email": "test@example.com", "login": "테스터"}""",
          ],
        )
        fun `사용자 정보 응답이 올바르지 않으면 OAUTH_PROFILE_FETCH_FAILED를 반환한다`(userInfoBody: String) {
          given(oauthStateRedisTemplate.opsForValue())
            .willReturn(oauthStateValueOperations)
          given(
            oauthStateValueOperations.getAndDelete(
              "oauth:state:$testState",
            ),
          ).willReturn(
            OAuthStateData(
              provider = OAuthProvider.GITHUB,
              redirectUri = "/dashboard",
            ),
          )
          given(oauthProperties.providers)
            .willReturn(mapOf(OAuthProvider.GITHUB.value to githubConfig))
          given(appProperties.baseUrl)
            .willReturn("http://localhost:8080")

          mockServer.expect(requestTo(githubConfig.tokenUri))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
              withSuccess(
                """{"access_token":"oauth-access-token"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo(githubConfig.userInfoUri))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                userInfoBody,
                MediaType.APPLICATION_JSON,
              ),
            )

          val result = service.handleCallback(
            OAuthProvider.GITHUB,
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
        fun `Github 사용자 정보를 올바르게 파싱한다`() {
          given(oauthStateRedisTemplate.opsForValue())
            .willReturn(oauthStateValueOperations)
          given(
            oauthStateValueOperations.getAndDelete(
              "oauth:state:$testState",
            ),
          ).willReturn(
            OAuthStateData(
              provider = OAuthProvider.GITHUB,
              redirectUri = "/dashboard",
            ),
          )
          given(oauthProperties.providers)
            .willReturn(mapOf(OAuthProvider.GITHUB.value to githubConfig))
          given(appProperties.baseUrl)
            .willReturn("http://localhost:8080")

          mockServer.expect(requestTo(githubConfig.tokenUri))
            .andExpect(method(HttpMethod.POST))
            .andRespond(
              withSuccess(
                """{"access_token":"oauth-access-token"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo(githubConfig.userInfoUri))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                """{"id": "github-123", "login":"테스터", "avatar_url":"https://example.com/profile.png"}""",
                MediaType.APPLICATION_JSON,
              ),
            )

          mockServer.expect(requestTo("https://api.github.com/user/emails"))
            .andExpect(method(HttpMethod.GET))
            .andRespond(
              withSuccess(
                """[{"email":"test@example.com","primary":true,"verified":true}]""",
                MediaType.APPLICATION_JSON,
              ),
            )

          given(
            authTransactionService.loginUser(
              any(OAuthUserInfo::class.java),
            ),
          ).willReturn(null)

          val result = service.handleCallback(
            OAuthProvider.GITHUB,
            testCode,
            testState,
          )

          val invocation = mockingDetails(authTransactionService)
            .invocations
            .single { it.method.name == "loginUser" }

          val actualUserInfo = invocation.arguments[0] as OAuthUserInfo

          assertEquals(
            OAuthUserInfo(
              email = "test@example.com",
              nickname = "테스터",
              profileImageUrl = "https://example.com/profile.png",
              provider = OAuthProvider.GITHUB,
              providerUserId = "github-123",
            ),
            actualUserInfo,
          )

          assertEquals(
            CallbackResult.Failure(
              OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT,
            ),
            result,
          )

          mockServer.verify()
        }
      }
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

      val loginUserResult = LoginUserResult(
        userId = 1L,
        role = UserRole.USER,
      )

      given(
        authTransactionService.loginUser(
          any(OAuthUserInfo::class.java),
        ),
      ).willReturn(loginUserResult)

      val testAccessToken = "test-access-token"
      val testRefreshTokenId = "test-refresh-token-id"
      val testRefreshToken = "test-refresh-token"
      given(
        jwtTokenProvider.generateAccessToken(
          loginUserResult.userId,
          loginUserResult.role,
        ),
      ).willReturn(testAccessToken)

      given(
        jwtTokenProvider.generateRefreshToken(loginUserResult.userId),
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
          loginUserResult.userId.toString(),
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

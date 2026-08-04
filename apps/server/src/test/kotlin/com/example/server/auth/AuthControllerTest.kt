package com.example.server.auth

import com.example.server.auth.dto.CallbackResult
import com.example.server.auth.types.OAuthErrorCode
import com.example.server.auth.types.OAuthProvider
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

@WebMvcTest(AuthController::class)
@ActiveProfiles("test")
class AuthControllerTest {

  @Autowired
  lateinit var mockMvc: MockMvc

  @MockitoBean
  lateinit var authService: AuthService

  @MockitoBean
  lateinit var appProperties: AppProperties

  @MockitoBean
  lateinit var jwtProperties: JwtProperties

  @BeforeEach
  fun setUp() {
    given(appProperties.frontendUrl).willReturn("http://localhost:5173")
    given(appProperties.production).willReturn(false)
    given(jwtProperties.accessTokenExpirationMinutes).willReturn(30L)
    given(jwtProperties.refreshTokenExpirationDays).willReturn(7L)
  }

  @Nested
  @DisplayName("GET /api/auth/oauth/{oauth_provider}")
  inner class GetAuthorizationUrl {
    @Test
    fun `지원하지 않는 OAuth provider로 요청 시 400 응답을 반환한다`() {
      mockMvc.get("/api/auth/oauth/unknown-provider") {
        param("redirect_uri", "http://localhost:5173/callback")
      }.andExpect {
        status { isBadRequest() }
      }
    }

    @Test
    fun `지원하는 OAuth provider로 요청 시 인증 URL로 리다이렉트한다`() {
      val authorizationUrl =
        "https://kauth.kakao.com/oauth/authorize?client_id=test"

      given(
        authService.getAuthorizationUrl(
          OAuthProvider.KAKAO,
          "http://localhost:5173/callback",
        ),
      ).willReturn(authorizationUrl)

      mockMvc.get("/api/auth/oauth/kakao") {
        param("redirect_uri", "http://localhost:5173/callback")
      }.andExpect {
        status { isFound() }
        header { string("Location", authorizationUrl) }
      }

      then(authService)
        .should()
        .getAuthorizationUrl(
          OAuthProvider.KAKAO,
          "http://localhost:5173/callback",
        )
    }
  }

  @Nested
  @DisplayName("GET /api/auth/oauth/{oauth_provider}/callback")
  inner class HandleOAuthCallback {
    private val testCode = "test-code"
    private val testState = "test-state"

    @Test
    fun `지원하지 않는 OAuth provider로 요청 시 400 응답을 반환한다`() {
      mockMvc.get("/api/auth/oauth/unknown-provider/callback") {
        param("code", testCode)
        param("state", testState)
      }.andExpect {
        status { isBadRequest() }
      }
    }

    @Test
    fun `state 파라미터 누락 시 OAUTH_STATE_MISSING 에러로 리다이렉트한다`() {
      mockMvc.get("/api/auth/oauth/google/callback") {
        param("code", testCode)
      }.andExpect {
        status { isFound() }
        header { string("Location", containsString(OAuthErrorCode.OAUTH_STATE_MISSING.name)) }
      }
    }

    @Test
    fun `error 파라미터 존재 시 OAUTH_ACCESS_DENIED 에러로 리다이렉트한다`() {
      mockMvc.get("/api/auth/oauth/google/callback") {
        param("state", testState)
        param("error", "access_denied")
      }.andExpect {
        status { isFound() }
        header { string("Location", containsString(OAuthErrorCode.OAUTH_ACCESS_DENIED.name)) }
      }
    }

    @Test
    fun `code 파라미터 누락 시 OAUTH_ACCESS_DENIED 에러로 리다이렉트한다`() {
      mockMvc.get("/api/auth/oauth/google/callback") {
        param("state", testState)
      }.andExpect {
        status { isFound() }
        header { string("Location", containsString(OAuthErrorCode.OAUTH_ACCESS_DENIED.name)) }
      }
    }

    @ParameterizedTest
    @EnumSource(
      value = OAuthErrorCode::class,
      names = [
        "OAUTH_STATE_EXPIRED",
        "OAUTH_STATE_MISMATCH",
        "OAUTH_CODE_EXCHANGE_FAILED",
        "OAUTH_PROFILE_FETCH_FAILED",
        "OAUTH_ACCOUNT_CONFLICT",
      ],
    )
    fun `handleCallback 실패 결과에 맞는 에러 코드로 리다이렉트한다`(errorCode: OAuthErrorCode) {
      given(
        authService.handleCallback(
          OAuthProvider.GOOGLE,
          testCode,
          testState,
        ),
      ).willReturn(CallbackResult.Failure(errorCode))

      mockMvc.get("/api/auth/oauth/google/callback") {
        param("code", testCode)
        param("state", testState)
      }.andExpect {
        status { isFound() }
        header {
          string(
            "Location",
            containsString(errorCode.name),
          )
        }
      }
    }

    @Test
    fun `handleCallback이 성공하면 access_token과 refresh_token 쿠키를 설정하고 리다이렉트한다`() {
      val accessToken = "test-access-token"
      val refreshToken = "test-refresh-token"
      val redirectUri = "/dashboard"

      given(
        authService.handleCallback(
          OAuthProvider.GOOGLE,
          testCode,
          testState,
        ),
      ).willReturn(
        CallbackResult.Success(
          accessToken = accessToken,
          refreshToken = refreshToken,
          redirectUri = redirectUri,
        ),
      )

      mockMvc.get("/api/auth/oauth/google/callback") {
        param("code", testCode)
        param("state", testState)
      }.andExpect {
        status { isFound() }
        cookie {
          value("access_token", accessToken)
          value("refresh_token", refreshToken)
        }
        header {
          string("Location", containsString(redirectUri))
        }
      }
    }
  }
}

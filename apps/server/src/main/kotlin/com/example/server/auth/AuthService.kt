package com.example.server.auth

import com.example.server.auth.dto.OAuthStateData
import com.example.server.auth.types.Mode
import com.example.server.auth.types.OAuthProvider
import com.example.server.auth.types.TokenType
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.OAuthProperties
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import org.springframework.web.util.UriComponentsBuilder
import java.time.Duration
import java.util.UUID

private const val OAUTH_STATE_TTL_MINUTES = 10L
private const val OAUTH_STATE_KEY_PREFIX = "oauth:state:"

@Service
class AuthService(
  private val oauthProperties: OAuthProperties,
  private val appProperties: AppProperties,
  private val jwtTokenProvider: JwtTokenProvider,
  private val oauthStateRedisTemplate: RedisTemplate<String, OAuthStateData>,
) {
  fun getAuthorizationUrl(provider: OAuthProvider, redirectUri: String, mode: Mode, accessToken: String?): String {
    if (!validateRedirectUri(redirectUri)) {
      throw CustomException(ErrorCode.BAD_REQUEST, "유효하지 않은 redirect URI입니다.")
    }

    val userId = when (mode) {
      Mode.LOGIN -> null
      Mode.LINK -> {
        val token = accessToken
          ?: throw CustomException(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.")
        if (
          !jwtTokenProvider.validateToken(token) ||
          jwtTokenProvider.getTokenType(token) != TokenType.ACCESS
        ) {
          throw CustomException(ErrorCode.UNAUTHORIZED, "유효하지 않은 access token입니다.")
        }
        jwtTokenProvider.getUserId(token)
      }
    }

    val providerConfig = oauthProperties.providers[provider.value]
      ?: throw CustomException(ErrorCode.BAD_REQUEST, "No provider found for ${provider.value}")

    val state = UUID.randomUUID().toString()
    val stateData = OAuthStateData(
      provider = provider,
      redirectUri = redirectUri,
      mode = mode,
      userId = userId,
    )
    // 콜백 완료 후 클라이언트를 원래 요청한 redirect_uri와 mode를 state에 연결하여 저장
    oauthStateRedisTemplate.opsForValue().set(
      "$OAUTH_STATE_KEY_PREFIX$state",
      stateData,
      Duration.ofMinutes(OAUTH_STATE_TTL_MINUTES),
    )

    val oauthRedirectUri = "${appProperties.baseUrl}/api/auth/oauth/${provider.value}/callback"

    val authorizationUrl = UriComponentsBuilder
      .fromUriString(providerConfig.authorizationUri)
      .queryParam("client_id", providerConfig.clientId)
      .queryParam("redirect_uri", oauthRedirectUri)
      .queryParam("response_type", "code")
      .queryParam("scope", providerConfig.scope)
      .queryParam("state", state)
      .build()
      .encode()
      .toUriString()

    return authorizationUrl
  }

  private fun validateRedirectUri(redirectUri: String): Boolean {
    // redirectUri는 반드시 도메인은 제외한 path만 허용 (예: /dashboard, /profile 등) 또한 반드시 /로 시작해야 함
    return redirectUri.startsWith("/") &&
      !redirectUri.startsWith("//") &&
      !redirectUri.contains("://") &&
      !redirectUri.contains("\\")
  }
}

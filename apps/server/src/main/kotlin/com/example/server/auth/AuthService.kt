package com.example.server.auth

import com.example.server.auth.types.Mode
import com.example.server.auth.types.OAuthProvider
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.OauthProperties
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
  private val oauthProperties: OauthProperties,
  private val appProperties: AppProperties,
  private val redisTemplate: RedisTemplate<String, String>,
) {
  fun getAuthorizationUrl(provider: OAuthProvider, redirectUri: String, mode: Mode): String {
    val providerConfig = oauthProperties.providers[provider.value]
      ?: throw CustomException(ErrorCode.BAD_REQUEST, "No provider found for ${provider.value}")

    val state = UUID.randomUUID().toString()
    // 콜백 완료 후 클라이언트를 원래 요청한 redirect_uri와 mode를 state에 연결하여 저장
    redisTemplate.opsForValue().set(
      "$OAUTH_STATE_KEY_PREFIX$state",
      "$redirectUri|$mode",
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
}

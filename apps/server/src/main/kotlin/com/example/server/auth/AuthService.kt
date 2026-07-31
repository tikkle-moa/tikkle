package com.example.server.auth

import com.example.server.auth.dto.CallbackResult
import com.example.server.auth.dto.CurrentUserResponse
import com.example.server.auth.dto.OAuthStateData
import com.example.server.auth.dto.OAuthUserInfo
import com.example.server.auth.repository.OAuthAccountRepository
import com.example.server.auth.repository.UserRepository
import com.example.server.auth.types.OAuthErrorCode
import com.example.server.auth.types.OAuthProvider
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.config.properties.OAuthProperties
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder
import java.time.Duration
import java.util.UUID

private const val OAUTH_STATE_TTL_MINUTES = 10L
private const val OAUTH_STATE_KEY_PREFIX = "oauth:state:"
private const val REFRESH_TOKEN_KEY_PREFIX = "auth:refresh:"

@Service
class AuthService(
  private val userRepository: UserRepository,
  private val oauthAccountRepository: OAuthAccountRepository,
  private val oauthProperties: OAuthProperties,
  private val appProperties: AppProperties,
  private val jwtProperties: JwtProperties,
  private val jwtTokenProvider: JwtTokenProvider,
  private val oauthStateRedisTemplate: RedisTemplate<String, OAuthStateData>,
  private val stringRedisTemplate: StringRedisTemplate,
  private val authTransactionService: AuthTransactionService,
) {
  private val restClient = RestClient.create()

  fun getAuthorizationUrl(provider: OAuthProvider, redirectUri: String): String {
    if (!validateRedirectUri(redirectUri)) {
      throw CustomException(ErrorCode.BAD_REQUEST, "유효하지 않은 redirect URI입니다.")
    }

    val providerConfig = oauthProperties.providers[provider.value]
      ?: throw CustomException(ErrorCode.BAD_REQUEST, "No provider found for ${provider.value}")

    val state = UUID.randomUUID().toString()
    val stateData = OAuthStateData(
      provider = provider,
      redirectUri = redirectUri,
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

  fun handleCallback(provider: OAuthProvider, code: String, state: String): CallbackResult {
    // 1. state 검증 및 데이터 추출 (one-time use)
    val stateData = oauthStateRedisTemplate.opsForValue().getAndDelete("$OAUTH_STATE_KEY_PREFIX$state")
      ?: return CallbackResult.Failure(OAuthErrorCode.OAUTH_STATE_EXPIRED)

    if (provider != stateData.provider) {
      return CallbackResult.Failure(OAuthErrorCode.OAUTH_STATE_MISMATCH)
    }

    val redirectUri = stateData.redirectUri

    // 2. 인가 코드 → 액세스 토큰 교환
    val oauthAccessToken = exchangeCodeForToken(code, provider)
      ?: return CallbackResult.Failure(OAuthErrorCode.OAUTH_CODE_EXCHANGE_FAILED)

    // 3. 사용자 정보 조회
    val oauthUserInfo = fetchUserInfo(oauthAccessToken, provider)
      ?: return CallbackResult.Failure(OAuthErrorCode.OAUTH_PROFILE_FETCH_FAILED)

    // 4. 사용자 저장
    val user = authTransactionService.loginUser(oauthUserInfo)
      ?: return CallbackResult.Failure(OAuthErrorCode.OAUTH_ACCOUNT_CONFLICT)

    // 5. 서비스 토큰 발급 (JWT access + refresh)
    val accessToken = jwtTokenProvider.generateAccessToken(user.userId, user.role)
    val issuedRefreshToken = jwtTokenProvider.generateRefreshToken(user.userId)

    val tokenId = issuedRefreshToken.tokenId
    val refreshToken = issuedRefreshToken.token

    stringRedisTemplate.opsForValue().set(
      "$REFRESH_TOKEN_KEY_PREFIX$tokenId",
      user.userId.toString(),
      Duration.ofDays(jwtProperties.refreshTokenExpirationDays),
    )

    // 6. 클라이언트의 원래 redirectUri로 리다이렉트
    return CallbackResult.Success(accessToken, refreshToken, redirectUri)
  }

  fun deleteOAuthState(state: String) {
    oauthStateRedisTemplate.delete("$OAUTH_STATE_KEY_PREFIX$state")
  }

  private fun exchangeCodeForToken(code: String, provider: OAuthProvider): String? {
    val providerConfig = oauthProperties.providers[provider.value]
      ?: return null

    val oauthRedirectUri = "${appProperties.baseUrl}/api/auth/oauth/${provider.value}/callback"

    val tokenParams = LinkedMultiValueMap<String, String>().apply {
      add("code", code)
      add("client_id", providerConfig.clientId)
      add("client_secret", providerConfig.clientSecret)
      add("redirect_uri", oauthRedirectUri)
      add("grant_type", "authorization_code")
    }

    val tokenResponse = runCatching {
      restClient.post()
        .uri(providerConfig.tokenUri)
        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
        .accept(MediaType.APPLICATION_JSON)
        .body(tokenParams)
        .retrieve()
        .body(Map::class.java)
    }.getOrNull() ?: return null

    val oauthAccessToken = tokenResponse["access_token"] as? String
      ?: return null

    return oauthAccessToken
  }

  private fun fetchUserInfo(oauthAccessToken: String, provider: OAuthProvider): OAuthUserInfo? {
    val providerConfig = oauthProperties.providers[provider.value]
      ?: return null

    val userInfo = runCatching {
      restClient.get()
        .uri(providerConfig.userInfoUri)
        .header("Authorization", "Bearer $oauthAccessToken")
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .body(Map::class.java)
    }.getOrNull() ?: return null

    val oauthUserInfo = runCatching {
      when (provider) {
        OAuthProvider.KAKAO -> parseKakaoUserInfo(userInfo)
        OAuthProvider.GOOGLE -> parseGoogleUserInfo(userInfo)
        OAuthProvider.NAVER -> parseNaverUserInfo(userInfo)
        OAuthProvider.GITHUB -> parseGithubUserInfo(userInfo, oauthAccessToken)
      }
    }.getOrNull() ?: return null

    return oauthUserInfo
  }

  private fun parseKakaoUserInfo(userInfo: Map<*, *>): OAuthUserInfo {
    val kakaoAccount = userInfo["kakao_account"] as? Map<*, *> ?: throw IllegalStateException("kakao_account not found")

    val email = kakaoAccount["email"] as? String ?: throw IllegalStateException("email not found")
    val profile = kakaoAccount["profile"] as? Map<*, *> ?: throw IllegalStateException("kakao_account not found")
    val nickname = profile["nickname"] as? String ?: throw IllegalStateException("nickname not found")
    val profileImageUrl = profile["profile_image_url"] as? String

    val providerUserId = userInfo["id"]?.toString() ?: throw IllegalStateException("user id not found")

    return OAuthUserInfo(
      email = email,
      nickname = nickname,
      profileImageUrl = profileImageUrl,
      provider = OAuthProvider.KAKAO,
      providerUserId = providerUserId,
    )
  }

  private fun parseGoogleUserInfo(userInfo: Map<*, *>): OAuthUserInfo {
    val email = userInfo["email"] as? String ?: throw IllegalStateException("email not found")
    val nickname = userInfo["name"] as? String ?: throw IllegalStateException("nickname not found")
    val profileImageUrl = userInfo["picture"] as? String

    val providerUserId = userInfo["sub"]?.toString() ?: throw IllegalStateException("user id not found")

    return OAuthUserInfo(
      email = email,
      nickname = nickname,
      profileImageUrl = profileImageUrl,
      provider = OAuthProvider.GOOGLE,
      providerUserId = providerUserId,
    )
  }

  private fun parseNaverUserInfo(userInfo: Map<*, *>): OAuthUserInfo {
    val response = userInfo["response"] as? Map<*, *> ?: throw IllegalStateException("response is not found")

    val email = response["email"] as? String ?: throw IllegalStateException("email not found")
    val nickname = response["name"] as? String ?: throw IllegalStateException("nickname not found")
    val profileImageUrl = response["profile_image"] as? String

    val providerUserId = response["id"] as? String ?: throw IllegalStateException("id not found")

    return OAuthUserInfo(
      email = email,
      nickname = nickname,
      profileImageUrl = profileImageUrl,
      provider = OAuthProvider.NAVER,
      providerUserId = providerUserId,
    )
  }

  private fun parseGithubUserInfo(userInfo: Map<*, *>, oauthAccessToken: String): OAuthUserInfo {
    val email = userInfo["email"] as? String
      ?: getGithubEmail(oauthAccessToken)
      ?: throw IllegalStateException("email not found")
    val nickname = userInfo["login"] as? String ?: throw IllegalStateException("login not found")
    val profileImageUrl = userInfo["avatar_url"] as? String

    val providerUserId = userInfo["id"]?.toString() ?: throw IllegalStateException("user id not found")

    return OAuthUserInfo(
      email = email,
      nickname = nickname,
      profileImageUrl = profileImageUrl,
      provider = OAuthProvider.GITHUB,
      providerUserId = providerUserId,
    )
  }

  private fun getGithubEmail(oauthAccessToken: String): String? {
    val githubEmails = runCatching {
      restClient.get()
        .uri("https://api.github.com/user/emails")
        .header("Authorization", "Bearer $oauthAccessToken")
        .accept(MediaType.APPLICATION_JSON)
        .retrieve()
        .body(List::class.java)
    }.getOrNull() ?: return null

    val emailMaps = githubEmails.filterIsInstance<Map<*, *>>()

    val selectedEmail = emailMaps.firstOrNull {
      it["primary"] == true && it["verified"] == true
    } ?: emailMaps.firstOrNull {
      it["verified"] == true
    } ?: return null

    return selectedEmail["email"] as? String
  }

  @Transactional(readOnly = true)
  fun getCurrentUser(userId: Long): CurrentUserResponse {
    val user = userRepository.findById(userId)
      .orElseThrow {
        CustomException(ErrorCode.UNAUTHORIZED)
      }

    val oauthProviders =
      oauthAccountRepository.findAllByUserId(userId).map { it.provider }

    return CurrentUserResponse.from(
      user = user,
      oauthProviders = oauthProviders,
    )
  }

  private fun validateRedirectUri(redirectUri: String): Boolean {
    // redirectUri는 반드시 도메인은 제외한 path만 허용 (예: /dashboard, /profile 등) 또한 반드시 /로 시작해야 함
    return redirectUri.startsWith("/") &&
      !redirectUri.startsWith("//") &&
      !redirectUri.contains("://") &&
      !redirectUri.contains("\\")
  }
}

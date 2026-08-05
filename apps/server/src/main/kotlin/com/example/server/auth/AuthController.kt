package com.example.server.auth

import com.example.server.auth.dto.CallbackResult
import com.example.server.auth.dto.CurrentUserResponse
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.OAuthErrorCode
import com.example.server.auth.types.OAuthProvider
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.global.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.net.URI
import java.time.Duration
import io.swagger.v3.oas.annotations.responses.ApiResponse as SwaggerApiResponse

@RestController
@RequestMapping("/auth")
class AuthController(private val authService: AuthService, private val appProperties: AppProperties, private val jwtProperties: JwtProperties) {
  @Operation(
    summary = "내 정보 조회",
    description = "로그인한 사용자의 정보를 반환합니다.",
    responses = [
      SwaggerApiResponse(responseCode = "200", description = "현재 로그인한 사용자 정보"),
      SwaggerApiResponse(
        responseCode = "401",
        description = "로그인하지 않은 사용자",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
    ],
    security = [SecurityRequirement(name = "access_token")],
  )
  @GetMapping("/me")
  fun getCurrentUser(@AuthenticationPrincipal loginUser: LoginUserResult): ResponseEntity<ApiResponse.Success<CurrentUserResponse>> {
    val currentUserResponse = authService.getCurrentUser(loginUser.userId)
    return ResponseEntity.ok()
      .body(ApiResponse.ok(currentUserResponse))
  }

  @PostMapping("/refresh")
  fun refresh(@CookieValue(name = "refresh_token", required = false) refreshToken: String?): ResponseEntity<ApiResponse.Success<Unit>> {
    val reissuedTokenPair = authService.refresh(refreshToken)

    val accessTokenCookie = ResponseCookie.from("access_token", reissuedTokenPair.accessToken)
      .httpOnly(true)
      .secure(appProperties.production)
      .sameSite("Lax")
      .path("/")
      .maxAge(Duration.ofMinutes(jwtProperties.accessTokenExpirationMinutes))
      .build()

    val refreshTokenCookie = ResponseCookie.from("refresh_token", reissuedTokenPair.refreshToken)
      .httpOnly(true)
      .secure(appProperties.production)
      .sameSite("Lax")
      .path("/api/auth")
      .maxAge(Duration.ofDays(jwtProperties.refreshTokenExpirationDays))
      .build()

    return ResponseEntity.ok()
      .header(HttpHeaders.SET_COOKIE, accessTokenCookie.toString())
      .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
      .body(ApiResponse.ok())
  }

  @PostMapping("/logout")
  fun logout(@CookieValue(name = "refresh_token", required = false) refreshToken: String?): ResponseEntity<ApiResponse.Success<Unit>> {
    authService.logout(refreshToken)

    return ResponseEntity.ok()
      .header(HttpHeaders.SET_COOKIE, expiredTokenCookie("access_token", "/").toString())
      .header(HttpHeaders.SET_COOKIE, expiredTokenCookie("refresh_token", "/api/auth").toString())
      .body(ApiResponse.ok())
  }

  @Operation(
    summary = "OAuth 인증 URL로 리다이렉트",
    description = "지원하는 OAuth provider로 요청 시 인증 URL로 리다이렉트합니다.",
    responses = [SwaggerApiResponse(responseCode = "302", description = "OAuth 인증 페이지로 리다이렉트")],
  )
  @GetMapping("/oauth/{oauth_provider}")
  fun getAuthorizationUrl(
    @PathVariable("oauth_provider") oauthProvider: OAuthProvider,
    @RequestParam("redirect_uri", defaultValue = "/") redirectUri: String,
  ): ResponseEntity<Void> {
    val authorizationUrl = authService.getAuthorizationUrl(oauthProvider, redirectUri)
    return ResponseEntity.status(HttpStatus.FOUND)
      .location(URI.create(authorizationUrl))
      .build()
  }

  @Operation(
    summary = "OAuth 인증 콜백 처리",
    description = "OAuth 인증 후 콜백을 처리하고, 로그인 성공 시 access_token과 refresh_token을 쿠키에 저장하고 프론트엔드로 리다이렉트합니다. 로그인 실패 시 에러 코드와 함께 프론트엔드로 리다이렉트합니다.",
    responses = [SwaggerApiResponse(responseCode = "302", description = "로그인 성공 또는 실패 후 프론트엔드로 리다이렉트")],
  )
  @GetMapping("/oauth/{oauth_provider}/callback")
  fun handleOAuthCallback(
    @PathVariable("oauth_provider") oauthProvider: OAuthProvider,
    @RequestParam(required = false) code: String?,
    @RequestParam(required = false) state: String?,
    @RequestParam(required = false) error: String?,
  ): ResponseEntity<Void> {
    // state 자체가 없으면 OAUTH_STATE_MISSING를 반환
    if (state == null) {
      return errorRedirect(OAuthErrorCode.OAUTH_STATE_MISSING)
    }

    // provider가 에러를 반환하거나 code가 없으면 OAUTH_ACCESS_DENIED를 반환
    if (error != null || code == null) {
      authService.deleteOAuthState(state)
      return errorRedirect(OAuthErrorCode.OAUTH_ACCESS_DENIED)
    }

    return when (val callbackResult = authService.handleCallback(oauthProvider, code, state)) {
      is CallbackResult.Success -> {
        val accessTokenCookie = ResponseCookie.from("access_token", callbackResult.accessToken)
          .httpOnly(true)
          .secure(appProperties.production)
          .sameSite("Lax")
          .path("/")
          .maxAge(Duration.ofMinutes(jwtProperties.accessTokenExpirationMinutes))
          .build()
        val refreshTokenCookie = ResponseCookie.from("refresh_token", callbackResult.refreshToken)
          .httpOnly(true)
          .secure(appProperties.production)
          .sameSite("Lax")
          .path("/api/auth")
          .maxAge(Duration.ofDays(jwtProperties.refreshTokenExpirationDays))
          .build()
        ResponseEntity.status(HttpStatus.FOUND)
          .header(HttpHeaders.SET_COOKIE, accessTokenCookie.toString())
          .header(HttpHeaders.SET_COOKIE, refreshTokenCookie.toString())
          .location(URI.create("${appProperties.frontendUrl}${callbackResult.redirectUri}"))
          .build()
      }
      is CallbackResult.Failure -> {
        errorRedirect(callbackResult.errorCode)
      }
    }
  }

  private fun expiredTokenCookie(name: String, path: String): ResponseCookie = ResponseCookie.from(name, "")
    .httpOnly(true)
    .secure(appProperties.production)
    .sameSite("Lax")
    .path(path)
    .maxAge(Duration.ZERO)
    .build()

  private fun errorRedirect(errorCode: OAuthErrorCode): ResponseEntity<Void> = ResponseEntity.status(HttpStatus.FOUND)
    .location(URI.create("${appProperties.frontendUrl}/login?error_code=${errorCode.name}"))
    .build()
}

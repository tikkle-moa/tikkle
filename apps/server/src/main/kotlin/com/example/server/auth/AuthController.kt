package com.example.server.auth

import com.example.server.auth.dto.CallbackResult
import com.example.server.auth.types.Mode
import com.example.server.auth.types.OAuthErrorCode
import com.example.server.auth.types.OAuthProvider
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.net.URI
import java.time.Duration

@RestController
@RequestMapping("/auth")
class AuthController(private val authService: AuthService, private val appProperties: AppProperties, private val jwtProperties: JwtProperties) {
  @GetMapping("/oauth/{oauth_provider}")
  fun getAuthorizationUrl(
    @PathVariable("oauth_provider") oauthProvider: OAuthProvider,
    @RequestParam("redirect_uri", defaultValue = "/") redirectUri: String,
    @RequestParam(defaultValue = "login") mode: Mode,
    @CookieValue("access_token", required = false) accessToken: String?,
  ): ResponseEntity<Void> {
    val authorizationUrl = authService.getAuthorizationUrl(oauthProvider, redirectUri, mode, accessToken)
    return ResponseEntity.status(HttpStatus.FOUND)
      .location(URI.create(authorizationUrl))
      .build()
  }

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
      is CallbackResult.LoginSuccess -> {
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
      is CallbackResult.LinkSuccess -> {
        ResponseEntity.status(HttpStatus.FOUND)
          .location(URI.create("${appProperties.frontendUrl}${callbackResult.redirectUri}"))
          .build()
      }
      is CallbackResult.Failure -> {
        errorRedirect(callbackResult.errorCode)
      }
    }
  }

  private fun errorRedirect(errorCode: OAuthErrorCode): ResponseEntity<Void> = ResponseEntity.status(HttpStatus.FOUND)
    .location(URI.create("${appProperties.frontendUrl}/login?error_code=${errorCode.name}"))
    .build()
}

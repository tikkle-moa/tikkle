package com.example.server.auth

import com.example.server.auth.types.Mode
import com.example.server.auth.types.OAuthProvider
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CookieValue
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.net.URI

@RestController
@RequestMapping("/auth")
class AuthController(private val authService: AuthService) {
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
}

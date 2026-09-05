package com.example.server.global.security

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.LoginUserResult
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.filter.OncePerRequestFilter

private const val ACCESS_TOKEN_COOKIE_NAME = "access_token"

class JwtAuthenticationFilter(private val jwtTokenProvider: JwtTokenProvider) : OncePerRequestFilter() {
  override fun doFilterInternal(request: HttpServletRequest, response: HttpServletResponse, filterChain: FilterChain) {
    val accessToken = request.cookies
      ?.firstOrNull { it.name == ACCESS_TOKEN_COOKIE_NAME }
      ?.value

    val accessTokenPayload = accessToken
      ?.let(jwtTokenProvider::parseAccessTokenPayload)

    if (
      accessTokenPayload != null &&
      SecurityContextHolder.getContext().authentication == null
    ) {
      val authentication = UsernamePasswordAuthenticationToken(
        LoginUserResult(
          userId = accessTokenPayload.userId,
          role = accessTokenPayload.role,
        ),
        null,
        listOf(
          SimpleGrantedAuthority("ROLE_${accessTokenPayload.role.name}"),
        ),
      ).apply {
        details = accessTokenPayload
      }

      val securityContext = SecurityContextHolder.createEmptyContext()
      securityContext.authentication = authentication
      SecurityContextHolder.setContext(securityContext)
    }

    filterChain.doFilter(request, response)
  }
}

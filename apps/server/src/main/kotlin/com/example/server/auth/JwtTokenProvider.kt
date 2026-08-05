package com.example.server.auth

import com.example.server.auth.dto.IssuedRefreshToken
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.TokenType
import com.example.server.auth.types.UserRole
import com.example.server.config.properties.JwtProperties
import io.jsonwebtoken.Claims
import io.jsonwebtoken.JwtException
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.Date
import java.util.UUID
import javax.crypto.SecretKey

@Component
class JwtTokenProvider(private val jwtProperties: JwtProperties) {
  private val secretKey: SecretKey = Keys.hmacShaKeyFor(
    jwtProperties.secret.toByteArray(StandardCharsets.UTF_8),
  )

  fun generateAccessToken(userId: Long, role: UserRole): String {
    val now = Instant.now()
    val expiresAt = now.plus(
      jwtProperties.accessTokenExpirationMinutes,
      ChronoUnit.MINUTES,
    )

    return Jwts.builder()
      .subject(userId.toString())
      .claim("type", TokenType.ACCESS.name)
      .claim("role", role.name)
      .issuedAt(Date.from(now))
      .expiration(Date.from(expiresAt))
      .signWith(secretKey)
      .compact()
  }

  fun generateRefreshToken(userId: Long): IssuedRefreshToken {
    val now = Instant.now()
    val expiresAt = now.plus(
      jwtProperties.refreshTokenExpirationDays,
      ChronoUnit.DAYS,
    )

    val tokenId = UUID.randomUUID().toString()
    val token = Jwts.builder()
      .id(tokenId)
      .subject(userId.toString())
      .claim("type", TokenType.REFRESH.name)
      .issuedAt(Date.from(now))
      .expiration(Date.from(expiresAt))
      .signWith(secretKey)
      .compact()

    return IssuedRefreshToken(
      token = token,
      tokenId = tokenId,
    )
  }

  fun parseAccessToken(token: String): LoginUserResult? {
    val claims = try {
      parseClaims(token)
    } catch (_: JwtException) {
      return null
    }

    if (claims["type"] as? String != TokenType.ACCESS.name) {
      return null
    }

    val userId = claims.subject?.toLongOrNull()
      ?: return null

    val roleName = claims["role"] as? String
      ?: return null

    val role = runCatching {
      UserRole.valueOf(roleName)
    }.getOrNull() ?: return null

    return LoginUserResult(
      userId = userId,
      role = role,
    )
  }

  private fun parseClaims(token: String): Claims = Jwts.parser()
    .verifyWith(secretKey)
    .build()
    .parseSignedClaims(token)
    .payload

  fun validateToken(token: String): Boolean {
    try {
      parseClaims(token)
      return true
    } catch (_: JwtException) {
      return false
    } catch (_: IllegalArgumentException) {
      return false
    }
  }

  fun getUserId(token: String): Long = parseClaims(token).subject.toLong()

  fun getTokenType(token: String): TokenType {
    val type = parseClaims(token)["type"] as? String
      ?: throw IllegalArgumentException("토큰 타입이 없습니다.")

    return runCatching {
      TokenType.valueOf(type)
    }.getOrNull() ?: throw IllegalArgumentException("지원하지 않는 토큰 타입입니다: $type")
  }

  fun getRole(token: String): UserRole {
    val role = parseClaims(token)["role"] as? String
      ?: throw IllegalArgumentException("역할이 없습니다.")
    return runCatching {
      UserRole.valueOf(role)
    }.getOrNull() ?: throw IllegalArgumentException("지원하지 않는 역할입니다: $role")
  }

  fun getTokenId(token: String): String = parseClaims(token).id
}

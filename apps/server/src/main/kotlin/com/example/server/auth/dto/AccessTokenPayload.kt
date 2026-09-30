package com.example.server.auth.dto

import com.example.server.auth.types.UserRole
import java.time.Instant

data class AccessTokenPayload(val userId: Long, val role: UserRole, val tokenId: String, val expiresAt: Instant)

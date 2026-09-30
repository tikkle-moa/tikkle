package com.example.server.auth.dto

data class RefreshTokenPayload(val userId: Long, val tokenId: String)

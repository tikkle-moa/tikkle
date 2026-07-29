package com.example.server.auth.dto

import com.example.server.auth.types.OAuthProvider

data class OAuthUserInfo(
  val email: String,
  val nickname: String,
  val profileImageUrl: String?,
  val provider: OAuthProvider,
  val providerUserId: String,
)

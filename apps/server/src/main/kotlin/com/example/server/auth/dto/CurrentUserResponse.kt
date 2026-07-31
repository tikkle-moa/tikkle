package com.example.server.auth.dto

import com.example.server.auth.entity.User
import com.example.server.auth.types.OAuthProvider
import com.example.server.auth.types.UserRole

data class CurrentUserResponse(
  val id: Long,
  val email: String,
  val nickname: String,
  val profileImageUrl: String?,
  val role: UserRole,
  val oauthAccounts: List<String>,
) {
  companion object {
    fun from(user: User, oauthProviders: List<OAuthProvider>): CurrentUserResponse = CurrentUserResponse(
      id = user.id,
      email = user.email,
      nickname = user.nickname,
      profileImageUrl = user.profileImageUrl,
      role = user.role,
      oauthAccounts = oauthProviders.map(OAuthProvider::value),
    )
  }
}

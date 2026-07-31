package com.example.server.auth.dto

import com.example.server.auth.entity.User
import com.example.server.auth.types.OAuthProvider
import com.example.server.auth.types.UserRole
import com.fasterxml.jackson.annotation.JsonProperty

data class CurrentUserResponse(
  val id: Long,
  val email: String,
  val nickname: String,

  @get:JsonProperty("profile_image_url")
  val profileImageUrl: String?,

  val role: UserRole,

  @get:JsonProperty("oauth_accounts")
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

package com.example.server.auth.repository

import com.example.server.auth.entity.OAuthAccount
import com.example.server.auth.types.OAuthProvider
import org.springframework.data.jpa.repository.JpaRepository

interface OAuthAccountRepository : JpaRepository<OAuthAccount, Long> {
  fun findByUserIdAndProvider(userId: Long, provider: OAuthProvider): OAuthAccount?
  fun findByProviderAndProviderUserId(provider: OAuthProvider, providerUserId: String): OAuthAccount?
}

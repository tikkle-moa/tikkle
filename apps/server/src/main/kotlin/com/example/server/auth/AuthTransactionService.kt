package com.example.server.auth

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.dto.OAuthUserInfo
import com.example.server.auth.entity.OAuthAccount
import com.example.server.auth.entity.User
import com.example.server.auth.repository.OAuthAccountRepository
import com.example.server.auth.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthTransactionService(private val userRepository: UserRepository, private val oauthAccountRepository: OAuthAccountRepository) {
  @Transactional
  fun loginUser(oauthUserInfo: OAuthUserInfo): LoginUserResult? {
    val oauthAccount = oauthAccountRepository.findByProviderAndProviderUserId(oauthUserInfo.provider, oauthUserInfo.providerUserId)
    if (oauthAccount != null) {
      val user = oauthAccount.user

      return LoginUserResult(userId = user.id, role = user.role)
    }

    val existingUser = userRepository.findByEmail(oauthUserInfo.email)
    if (existingUser != null) {
      return null
    }

    val newUser = userRepository.save(
      User(
        email = oauthUserInfo.email,
        nickname = oauthUserInfo.nickname,
        profileImageUrl = oauthUserInfo.profileImageUrl,
      ),
    )

    oauthAccountRepository.save(
      OAuthAccount(
        user = newUser,
        provider = oauthUserInfo.provider,
        providerUserId = oauthUserInfo.providerUserId,
        providerEmail = oauthUserInfo.email,
      ),
    )

    return LoginUserResult(userId = newUser.id, role = newUser.role)
  }
}

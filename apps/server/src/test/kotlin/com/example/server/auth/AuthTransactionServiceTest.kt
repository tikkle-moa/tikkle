package com.example.server.auth

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.dto.OAuthUserInfo
import com.example.server.auth.entity.OAuthAccount
import com.example.server.auth.entity.User
import com.example.server.auth.repository.OAuthAccountRepository
import com.example.server.auth.repository.UserRepository
import com.example.server.auth.types.OAuthProvider
import com.example.server.auth.types.UserRole
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertNotNull
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import kotlin.test.assertEquals
import kotlin.test.assertNull

@ExtendWith(MockitoExtension::class)
class AuthTransactionServiceTest {

  @Mock
  lateinit var userRepository: UserRepository

  @Mock
  lateinit var oauthAccountRepository: OAuthAccountRepository

  private lateinit var service: AuthTransactionService

  @BeforeEach
  fun setUp() {
    service = AuthTransactionService(userRepository, oauthAccountRepository)
  }

  @Nested
  inner class LoginUser {
    private val oauthUserInfo = OAuthUserInfo(
      email = "test@example.com",
      nickname = "테스터",
      profileImageUrl = null,
      provider = OAuthProvider.GOOGLE,
      providerUserId = "google-123",
    )

    @Test
    fun `이미 연동된 OAuth 계정이 있으면 기존 유저를 반환한다`() {
      val existingUser = User(id = 1L, email = oauthUserInfo.email, nickname = oauthUserInfo.nickname)
      val existingAccount = OAuthAccount(
        user = existingUser,
        provider = oauthUserInfo.provider,
        providerUserId = oauthUserInfo.providerUserId,
        providerEmail = oauthUserInfo.email,
      )
      given(
        oauthAccountRepository.findByProviderAndProviderUserId(oauthUserInfo.provider, oauthUserInfo.providerUserId),
      ).willReturn(existingAccount)

      val result = service.loginUser(oauthUserInfo)

      assertEquals(
        LoginUserResult(existingUser.id, existingUser.role),
        result,
      )

      then(userRepository).shouldHaveNoInteractions()

      then(oauthAccountRepository)
        .should()
        .findByProviderAndProviderUserId(
          oauthUserInfo.provider,
          oauthUserInfo.providerUserId,
        )
      then(oauthAccountRepository).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `OAuth 계정이 없고 이메일이 이미 다른 계정에서 사용 중이면 null을 반환한다`() {
      val conflictUser = User(id = 2L, email = oauthUserInfo.email, nickname = "다른유저")
      given(
        oauthAccountRepository.findByProviderAndProviderUserId(oauthUserInfo.provider, oauthUserInfo.providerUserId),
      ).willReturn(null)
      given(userRepository.findByEmail(oauthUserInfo.email)).willReturn(conflictUser)

      val result = service.loginUser(oauthUserInfo)

      assertNull(result)

      then(userRepository)
        .should()
        .findByEmail(oauthUserInfo.email)
      then(userRepository)
        .should(never())
        .save(any(User::class.java))

      then(oauthAccountRepository)
        .should(never())
        .save(any(OAuthAccount::class.java))
    }

    @Test
    fun `신규 유저는 User와 OAuthAccount를 저장하고 반환한다`() {
      val newUser = User(id = 3L, email = oauthUserInfo.email, nickname = oauthUserInfo.nickname)
      given(
        oauthAccountRepository.findByProviderAndProviderUserId(oauthUserInfo.provider, oauthUserInfo.providerUserId),
      ).willReturn(null)
      given(userRepository.findByEmail(oauthUserInfo.email)).willReturn(null)
      given(userRepository.save(any(User::class.java))).willReturn(newUser)

      val result = service.loginUser(oauthUserInfo)

      assertEquals(
        LoginUserResult(newUser.id, newUser.role),
        result,
      )

      then(userRepository).should().save(any(User::class.java))
      then(oauthAccountRepository).should().save(any(OAuthAccount::class.java))
    }

    @Test
    fun `신규 유저의 기본 role은 USER다`() {
      val newUser = User(id = 4L, email = oauthUserInfo.email, nickname = oauthUserInfo.nickname)
      given(
        oauthAccountRepository.findByProviderAndProviderUserId(oauthUserInfo.provider, oauthUserInfo.providerUserId),
      ).willReturn(null)
      given(userRepository.findByEmail(oauthUserInfo.email)).willReturn(null)
      given(userRepository.save(any(User::class.java))).willReturn(newUser)

      val result = service.loginUser(oauthUserInfo)

      assertNotNull(result)
      assertEquals(UserRole.USER, result.role)
    }

    private fun <T> any(type: Class<T>): T = org.mockito.ArgumentMatchers.any(type)
  }
}

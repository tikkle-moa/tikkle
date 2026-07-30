package com.example.server.auth.dto

import com.example.server.auth.types.OAuthErrorCode

sealed interface CallbackResult {
  data class Success(val accessToken: String, val refreshToken: String, val redirectUri: String) : CallbackResult

  data class Failure(val errorCode: OAuthErrorCode) : CallbackResult
}

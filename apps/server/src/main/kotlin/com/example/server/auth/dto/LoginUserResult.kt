package com.example.server.auth.dto

import com.example.server.auth.types.UserRole
import java.security.Principal

data class LoginUserResult(val userId: Long, val role: UserRole) : Principal {
  override fun getName(): String = userId.toString()
}

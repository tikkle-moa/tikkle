package com.example.server.auth.dto

import com.example.server.auth.types.UserRole

data class LoginUserResult(val userId: Long, val role: UserRole)

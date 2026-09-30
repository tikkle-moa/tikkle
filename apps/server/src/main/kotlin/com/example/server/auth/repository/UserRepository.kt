package com.example.server.auth.repository

import com.example.server.auth.entity.User
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, Long> {
  fun findByEmail(email: String): User?
}

package com.example.server.auth.repository

import com.example.server.auth.entity.User
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface UserRepository : JpaRepository<User, Long> {
  fun findByEmail(email: String): User?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT user FROM User user WHERE user.id = :userId")
  fun findByIdForUpdate(@Param("userId") userId: Long): User?
}

package com.example.server.auth.entity

import com.example.server.auth.types.UserRole
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "users")
class User(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @Column(nullable = false, unique = true, length = 255)
  var email: String,

  @Column(nullable = false, length = 50)
  var nickname: String,

  @Column(name = "profile_image_url", length = 500)
  var profileImageUrl: String? = null,

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  var role: UserRole = UserRole.USER,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

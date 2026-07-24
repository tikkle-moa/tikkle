package com.example.server.auth.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(
  name = "oauth_accounts",
  uniqueConstraints = [UniqueConstraint(name = "uq_oauth_provider", columnNames = ["provider", "provider_user_id"])],
)
class OauthAccount(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  var user: User,

  @Column(nullable = false, length = 50)
  var provider: String,

  @Column(name = "provider_user_id", nullable = false, length = 255)
  var providerUserId: String,

  @Column(name = "provider_email", length = 255)
  var providerEmail: String? = null,

  @Column(name = "access_token", columnDefinition = "TEXT")
  var accessToken: String? = null,

  @Column(name = "refresh_token", columnDefinition = "TEXT")
  var refreshToken: String? = null,

  @Column(name = "token_expires_at")
  var tokenExpiresAt: LocalDateTime? = null,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

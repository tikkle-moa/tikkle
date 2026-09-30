package com.example.server.auth.entity

import com.example.server.auth.types.OAuthProvider
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
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
  uniqueConstraints = [
    UniqueConstraint(name = "uq_oauth_user_provider", columnNames = ["user_id", "provider"]),
    UniqueConstraint(name = "uq_oauth_provider", columnNames = ["provider", "provider_user_id"]),
  ],
)
class OAuthAccount(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  var user: User,

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  var provider: OAuthProvider,

  @Column(name = "provider_user_id", nullable = false, length = 255)
  var providerUserId: String,

  @Column(name = "provider_email", nullable = false, length = 255)
  var providerEmail: String,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

package com.example.server.group.entity

import com.example.server.auth.entity.User
import com.example.server.performance.entity.Performance
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
  name = "`groups`",
  uniqueConstraints = [
    UniqueConstraint(name = "uq_group_invite_code", columnNames = ["invite_code"]),
  ],
)
class Group(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "performance_id", nullable = false)
  var performance: Performance,

  @Column(name = "invite_code", nullable = false, length = 36)
  var inviteCode: String = java.util.UUID.randomUUID().toString(),

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "leader_user_id", nullable = true)
  var leader: User? = null,

  @Column(name = "expires_at", nullable = false)
  var expiresAt: LocalDateTime,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

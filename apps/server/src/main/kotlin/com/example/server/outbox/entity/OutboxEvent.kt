package com.example.server.outbox.entity

import com.example.server.outbox.types.OutboxEventStatus
import com.example.server.outbox.types.OutboxEventType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import org.hibernate.annotations.UpdateTimestamp
import java.time.LocalDateTime
import java.util.UUID

@Entity
@Table(
  name = "outbox_events",
  indexes = [
    Index(name = "idx_outbox_pending", columnList = "status,next_attempt_at,id"),
    Index(name = "idx_outbox_lock", columnList = "status,locked_at,id"),
    Index(name = "idx_outbox_cleanup", columnList = "status,performance_id,id"),
  ],
)
class OutboxEvent(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @Column(name = "event_id", nullable = false, unique = true, length = 36)
  var eventId: String = UUID.randomUUID().toString(),

  @Column(name = "event_key", nullable = false, unique = true, length = 150)
  var eventKey: String,

  @Column(name = "aggregate_type", nullable = false, length = 50)
  var aggregateType: String,

  @Column(name = "aggregate_id", nullable = false)
  var aggregateId: Long,

  @Column(name = "performance_id", nullable = false)
  var performanceId: Long,

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false, length = 100)
  var eventType: OutboxEventType,

  @Column(name = "payload", nullable = false, columnDefinition = "JSON")
  var payload: String,

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  var status: OutboxEventStatus = OutboxEventStatus.PENDING,

  @Column(name = "attempt_count", nullable = false)
  var attemptCount: Int = 0,

  @Column(name = "next_attempt_at", nullable = false)
  var nextAttemptAt: LocalDateTime = LocalDateTime.now(),

  @Column(name = "lock_token", length = 100)
  var lockToken: String? = null,

  @Column(name = "locked_at")
  var lockedAt: LocalDateTime? = null,

  @Column(name = "last_error", columnDefinition = "TEXT")
  var lastError: String? = null,

  @Column(name = "occurred_at", nullable = false)
  var occurredAt: LocalDateTime = LocalDateTime.now(),

  @Column(name = "published_at")
  var publishedAt: LocalDateTime? = null,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  var updatedAt: LocalDateTime = LocalDateTime.now(),
)

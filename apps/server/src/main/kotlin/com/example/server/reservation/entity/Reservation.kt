package com.example.server.reservation.entity

import com.example.server.auth.entity.User
import com.example.server.performance.entity.Performance
import com.example.server.reservation.types.ReservationStatus
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
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "reservations")
class Reservation(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "performance_id", nullable = false)
  var performance: Performance,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "booker_user_id", nullable = false)
  var booker: User,

  @Column(name = "hold_id", nullable = false, unique = true, length = 100)
  var holdId: String,

  @Column(name = "order_id", nullable = false, unique = true, length = 100)
  var orderId: String,

  @Column(name = "order_name", nullable = false)
  var orderName: String,

  @Column(nullable = false)
  var amount: Int,

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  var status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,

  @Column(name = "payment_expires_at", nullable = false)
  var paymentExpiresAt: LocalDateTime,

  @Column(name = "payment_attempt_key", unique = true, length = 200)
  var paymentAttemptKey: String? = null,

  @Column(name = "payment_confirming_at")
  var paymentConfirmingAt: LocalDateTime? = null,

  @Column(name = "payment_key", unique = true)
  var paymentKey: String? = null,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

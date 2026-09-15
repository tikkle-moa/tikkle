package com.example.server.reservation.entity

import com.example.server.performance.entity.Performance
import com.example.server.venue.entity.VenueSeat
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
  name = "reservation_seats",
  uniqueConstraints = [
    UniqueConstraint(name = "uq_reservation_performance_venue_seat", columnNames = ["performance_id", "venue_seat_id"]),
    UniqueConstraint(name = "uq_reservation_venue_seat", columnNames = ["reservation_id", "venue_seat_id"]),
  ],
)
class ReservationSeat(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "reservation_id", nullable = false)
  var reservation: Reservation,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "performance_id", nullable = false)
  var performance: Performance,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "venue_seat_id", nullable = false)
  var venueSeat: VenueSeat,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

package com.example.server.venue.entity

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
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(
  name = "venue_seats",
  uniqueConstraints = [
    UniqueConstraint(name = "uq_venue_seat", columnNames = ["venue_id", "section_name", "seat_number"]),
  ],
)
class VenueSeat(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "venue_id", nullable = false)
  var venue: Venue,

  @Column(name = "section_name", nullable = false, length = 50)
  var sectionName: String,

  @Column(name = "seat_number", nullable = false)
  var seatNumber: Int,

  @Column(name = "seat_label", nullable = false, length = 50)
  var seatLabel: String,

  @Column(nullable = false)
  var price: Int,

  @Column(name = "position_x", nullable = false, precision = 8, scale = 2)
  var positionX: BigDecimal,

  @Column(name = "position_y", nullable = false, precision = 8, scale = 2)
  var positionY: BigDecimal,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

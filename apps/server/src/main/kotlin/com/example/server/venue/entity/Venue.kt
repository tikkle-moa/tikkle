package com.example.server.venue.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(name = "venues")
class Venue(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @Column(nullable = false, length = 255)
  var name: String,

  @Column(nullable = false, length = 255)
  var address: String,

  @Column(columnDefinition = "TEXT")
  var description: String? = null,

  @Column(nullable = false, precision = 8, scale = 2)
  var width: BigDecimal,

  @Column(nullable = false, precision = 8, scale = 2)
  var height: BigDecimal,

  @Column(name = "stage_position_x", nullable = false, precision = 8, scale = 2)
  var stagePositionX: BigDecimal,

  @Column(name = "stage_position_y", nullable = false, precision = 8, scale = 2)
  var stagePositionY: BigDecimal,

  @Column(name = "stage_width", nullable = false, precision = 8, scale = 2)
  var stageWidth: BigDecimal,

  @Column(name = "stage_height", nullable = false, precision = 8, scale = 2)
  var stageHeight: BigDecimal,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

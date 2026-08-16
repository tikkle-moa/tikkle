package com.example.server.concert.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import org.hibernate.annotations.CreationTimestamp
import java.time.LocalDateTime

@Entity
@Table(name = "concerts")
class Concert(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @Column(nullable = false, length = 255)
  var title: String,

  @Column(name = "place_name", nullable = false, length = 255)
  var placeName: String,

  @Column(name = "poster_url", length = 500)
  var posterUrl: String? = null,

  @Column(columnDefinition = "TEXT")
  var description: String? = null,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

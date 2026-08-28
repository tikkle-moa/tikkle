package com.example.server.concert.entity

import com.example.server.concert.types.ConcertGenre
import com.example.server.venue.entity.Venue
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
@Table(name = "concerts")
class Concert(
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  var id: Long = 0,

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "venue_id", nullable = false)
  var venue: Venue,

  @Column(nullable = false, length = 255)
  var title: String,

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  var genre: ConcertGenre,

  @Column(name = "poster_url", length = 500)
  var posterUrl: String? = null,

  @Column(columnDefinition = "TEXT")
  var description: String? = null,

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  var createdAt: LocalDateTime = LocalDateTime.now(),
)

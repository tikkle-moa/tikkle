package com.example.server.concert.repository

import com.example.server.concert.entity.Concert
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface ConcertRepository : JpaRepository<Concert, Long> {
  @EntityGraph(attributePaths = ["venue"])
  fun findAllByOrderByCreatedAtDesc(): List<Concert>
  fun existsByVenueId(venueId: Long): Boolean
}

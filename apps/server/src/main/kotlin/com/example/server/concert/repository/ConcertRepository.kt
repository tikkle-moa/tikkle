package com.example.server.concert.repository

import com.example.server.concert.entity.Concert
import com.example.server.performance.projection.VenueCountProjection
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ConcertRepository : JpaRepository<Concert, Long> {
  @EntityGraph(attributePaths = ["venue"])
  fun findAllByOrderByCreatedAtDesc(): List<Concert>
  fun existsByVenueId(venueId: Long): Boolean

  @Query(
    """
    select c.venue.id as venueId, count(c.id) as count
    from Concert c
    group by c.venue.id
    """,
  )
  fun countGroupByVenueId(): List<VenueCountProjection>
}

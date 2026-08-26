package com.example.server.performance.repository

import com.example.server.concert.entity.Concert
import com.example.server.performance.entity.Performance
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface PerformanceRepository : JpaRepository<Performance, Long> {
  @Query(
    """
      SELECT p
      FROM Performance p
      WHERE p.concert = :concert
      ORDER BY
        CASE WHEN p.startsAt >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END ASC,
        p.startsAt ASC
    """,
  )
  fun findAllByConcertUpcomingFirstOrderByStartsAtAsc(concert: Concert): List<Performance>

  @Query(
    """
      SELECT p
      FROM Performance p
      ORDER BY
        CASE WHEN p.startsAt >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END ASC,
        p.startsAt ASC
    """,
  )
  fun findAllUpcomingFirstOrderByStartsAtAsc(): List<Performance>
}

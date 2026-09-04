package com.example.server.venue.repository

import com.example.server.performance.projection.VenueCountProjection
import com.example.server.venue.entity.VenueSeat
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface VenueSeatRepository : JpaRepository<VenueSeat, Long> {
  fun findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(venueId: Long): List<VenueSeat>

  @Query(
    """
    select vs.venue.id as venueId, count(vs.id) as count
    from VenueSeat vs
    group by vs.venue.id
    """,
  )
  fun countGroupByVenueId(): List<VenueCountProjection>

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("DELETE FROM VenueSeat vs WHERE vs.venue.id = :venueId")
  fun deleteAllByVenueId(venueId: Long): Int
}

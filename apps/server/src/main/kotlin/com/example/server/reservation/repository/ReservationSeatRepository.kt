package com.example.server.reservation.repository

import com.example.server.reservation.entity.ReservationSeat
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ReservationSeatRepository : JpaRepository<ReservationSeat, Long> {
  @Query(
    """
    SELECT CASE WHEN COUNT(rs) > 0 THEN true ELSE false END
    FROM ReservationSeat rs
    WHERE rs.performance.id = :performanceId
      AND rs.venueSeat.id IN :venueSeatIds
    """,
  )
  fun existsByPerformanceIdAndVenueSeatIdIn(performanceId: Long, venueSeatIds: Collection<Long>): Boolean
}

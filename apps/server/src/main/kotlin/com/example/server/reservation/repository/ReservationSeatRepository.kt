package com.example.server.reservation.repository

import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.types.ReservationStatus
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ReservationSeatRepository : JpaRepository<ReservationSeat, Long> {
  @Query(
    """
    SELECT rs.venueSeat.id
    FROM ReservationSeat rs
    WHERE rs.performance.id = :performanceId
      AND rs.reservation.status = :status
    ORDER BY rs.venueSeat.id
    """,
  )
  fun findVenueSeatIdsByPerformanceIdAndReservationStatus(performanceId: Long, status: ReservationStatus): List<Long>

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

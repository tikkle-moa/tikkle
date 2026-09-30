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
    WHERE rs.reservation.id = :reservationId
    ORDER BY rs.venueSeat.id
    """,
  )
  fun findVenueSeatIdsByReservationId(reservationId: Long): List<Long>

  @Query(
    """
    SELECT rs.venueSeat.id
    FROM ReservationSeat rs
    WHERE rs.performance.id = :performanceId
      AND rs.reservation.status IN :statuses
    ORDER BY rs.venueSeat.id
    """,
  )
  fun findVenueSeatIdsByPerformanceIdAndReservationStatusIn(performanceId: Long, statuses: Collection<ReservationStatus>): List<Long>

  @Query(
    """
    SELECT rs.venueSeat.id
    FROM ReservationSeat rs
    WHERE rs.performance.id = :performanceId
      AND rs.venueSeat.id IN :venueSeatIds
      AND rs.reservation.status IN :statuses
    ORDER BY rs.venueSeat.id
    """,
  )
  fun findVenueSeatIdsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
    performanceId: Long,
    venueSeatIds: Collection<Long>,
    statuses: Collection<ReservationStatus>,
  ): List<Long>

  @Query(
    """
    SELECT CASE WHEN COUNT(rs) > 0 THEN true ELSE false END
    FROM ReservationSeat rs
    WHERE rs.performance.id = :performanceId
      AND rs.venueSeat.id IN :venueSeatIds
      AND rs.reservation.status IN :statuses
    """,
  )
  fun existsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
    performanceId: Long,
    venueSeatIds: Collection<Long>,
    statuses: Collection<ReservationStatus>,
  ): Boolean

  @Query(
    """
    SELECT rs
    FROM ReservationSeat rs
    JOIN FETCH rs.venueSeat
    WHERE rs.reservation.id IN :reservationIds
    ORDER BY rs.reservation.id, rs.venueSeat.sectionName, rs.venueSeat.seatNumber, rs.id
    """,
  )
  fun findAllDetailsByReservationIds(reservationIds: Collection<Long>): List<ReservationSeat>
}

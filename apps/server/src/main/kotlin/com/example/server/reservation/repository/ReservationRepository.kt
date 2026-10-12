package com.example.server.reservation.repository

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Limit
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface ReservationRepository : JpaRepository<Reservation, Long> {
  @Query(
    """
    SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
    FROM Reservation r
    WHERE (:groupId IS NOT NULL AND r.groupId = :groupId)
       OR (
         :groupId IS NULL
         AND r.groupId IS NULL
         AND r.booker.id = :bookerUserId
         AND r.performance.id = :performanceId
       )
    """,
  )
  fun existsByScope(
    @Param("groupId") groupId: Long?,
    @Param("bookerUserId") bookerUserId: Long,
    @Param("performanceId") performanceId: Long,
  ): Boolean

  @Query(
    """
    SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END
    FROM Reservation r
    WHERE r.status IN :statuses
      AND (
        (:groupId IS NOT NULL AND r.groupId = :groupId)
        OR (
          :groupId IS NULL
          AND r.groupId IS NULL
          AND r.booker.id = :bookerUserId
          AND r.performance.id = :performanceId
        )
      )
    """,
  )
  fun existsPaymentInProgressByScope(
    @Param("groupId") groupId: Long?,
    @Param("bookerUserId") bookerUserId: Long,
    @Param("performanceId") performanceId: Long,
    @Param("statuses") statuses: Collection<ReservationStatus>,
  ): Boolean

  @Query(
    """
    SELECT r
    FROM Reservation r
    JOIN FETCH r.performance p
    JOIN FETCH p.concert c
    JOIN FETCH c.venue
    WHERE r.booker.id = :userId
      AND r.status <> :excludedStatus
    ORDER BY r.createdAt DESC, r.id DESC
    """,
  )
  fun findAllByBookerIdAndStatusNotOrderByCreatedAtDesc(
    @Param("userId") userId: Long,
    @Param("excludedStatus") excludedStatus: ReservationStatus,
  ): List<Reservation>

  @Query(
    """
    SELECT r
    FROM Reservation r
    JOIN FETCH r.performance p
    JOIN FETCH p.concert c
    JOIN FETCH c.venue
    JOIN FETCH r.booker
    WHERE r.id = :reservationId
    """,
  )
  fun findReservationDetailsById(@Param("reservationId") reservationId: Long): Reservation?

  @Query(
    """
    SELECT r
    FROM Reservation r
    JOIN FETCH r.performance p
    JOIN FETCH p.concert c
    JOIN FETCH c.venue
    WHERE r.id = :reservationId
    """,
  )
  fun findPaymentOrderById(reservationId: Long): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.orderId = :orderId")
  fun findByOrderIdForUpdate(orderId: String): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.id = :reservationId")
  fun findByIdForUpdate(reservationId: Long): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
    """
    SELECT r
    FROM Reservation r
    WHERE (:groupId IS NOT NULL AND r.groupId = :groupId)
       OR (
         :groupId IS NULL
         AND r.groupId IS NULL
         AND r.booker.id = :bookerUserId
         AND r.performance.id = :performanceId
       )
    """,
  )
  fun findByScopeForUpdate(
    @Param("groupId") groupId: Long?,
    @Param("bookerUserId") bookerUserId: Long,
    @Param("performanceId") performanceId: Long,
  ): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
    """
    SELECT r
    FROM Reservation r
    WHERE r.status IN :statuses
      AND (
        (:groupId IS NOT NULL AND r.groupId = :groupId)
        OR (
          :groupId IS NULL
          AND r.groupId IS NULL
          AND r.booker.id = :bookerUserId
          AND r.performance.id = :performanceId
        )
      )
    """,
  )
  fun findPaymentInProgressByScopeForUpdate(
    @Param("groupId") groupId: Long?,
    @Param("bookerUserId") bookerUserId: Long,
    @Param("performanceId") performanceId: Long,
    @Param("statuses") statuses: Collection<ReservationStatus>,
  ): Reservation?

  @Modifying(
    flushAutomatically = true,
    clearAutomatically = true,
  )
  @Query(
    value = """
    INSERT INTO reservations (
      performance_id,
      booker_user_id,
      group_id,
      order_id,
      order_name,
      amount,
      status,
      payment_expires_at,
      created_at
    )
    VALUES (
      :performanceId,
      :bookerUserId,
      :groupId,
      :orderId,
      :orderName,
      :amount,
      'PAYMENT_PENDING',
      :paymentExpiresAt,
      CURRENT_TIMESTAMP
    )
    ON DUPLICATE KEY UPDATE id = id
  """,
    nativeQuery = true,
  )
  fun insertPaymentPendingIfAbsent(
    @Param("performanceId") performanceId: Long,
    @Param("bookerUserId") bookerUserId: Long,
    @Param("groupId") groupId: Long?,
    @Param("orderId") orderId: String,
    @Param("orderName") orderName: String,
    @Param("amount") amount: Int,
    @Param("paymentExpiresAt") paymentExpiresAt: LocalDateTime,
  ): Int

  fun findAllByStatusAndPaymentExpiresAtBefore(status: ReservationStatus, paymentExpiresAt: LocalDateTime): List<Reservation>

  fun findAllByStatusInAndIdGreaterThanOrderByIdAsc(statuses: Collection<ReservationStatus>, id: Long, limit: Limit): List<Reservation>
}

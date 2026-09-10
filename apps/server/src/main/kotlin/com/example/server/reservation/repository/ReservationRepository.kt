package com.example.server.reservation.repository

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface ReservationRepository : JpaRepository<Reservation, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.orderId = :orderId")
  fun findByOrderIdForUpdate(orderId: String): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.id = :reservationId")
  fun findByIdForUpdate(reservationId: Long): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.holdId = :holdId")
  fun findByHoldIdForUpdate(holdId: String): Reservation?

  @Modifying(
    flushAutomatically = true,
    clearAutomatically = true,
  )
  @Query(
    value = """
    INSERT INTO reservations (
      performance_id,
      booker_user_id,
      hold_id,
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
      :holdId,
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
    @Param("holdId") holdId: String,
    @Param("orderId") orderId: String,
    @Param("orderName") orderName: String,
    @Param("amount") amount: Int,
    @Param("paymentExpiresAt") paymentExpiresAt: LocalDateTime,
  ): Int

  fun findAllByStatusAndPaymentExpiresAtBefore(status: ReservationStatus, paymentExpiresAt: LocalDateTime): List<Reservation>
}

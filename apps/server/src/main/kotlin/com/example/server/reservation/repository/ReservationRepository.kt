package com.example.server.reservation.repository

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.types.ReservationStatus
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import java.time.LocalDateTime

interface ReservationRepository : JpaRepository<Reservation, Long> {
  fun findByHoldId(holdId: String): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.orderId = :orderId")
  fun findByOrderIdForUpdate(orderId: String): Reservation?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT r FROM Reservation r WHERE r.id = :reservationId")
  fun findByIdForUpdate(reservationId: Long): Reservation?

  fun findAllByStatusAndPaymentExpiresAtBefore(status: ReservationStatus, paymentExpiresAt: LocalDateTime): List<Reservation>
}

package com.example.server.reservation.repository

import com.example.server.reservation.entity.ReservationGroupMember
import org.springframework.data.jpa.repository.JpaRepository

interface ReservationGroupMemberRepository : JpaRepository<ReservationGroupMember, Long> {
  fun findAllByReservationIdOrderByIdAsc(reservationId: Long): List<ReservationGroupMember>
}

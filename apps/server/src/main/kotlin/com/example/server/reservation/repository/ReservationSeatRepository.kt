package com.example.server.reservation.repository

import com.example.server.reservation.entity.ReservationSeat
import org.springframework.data.jpa.repository.JpaRepository

interface ReservationSeatRepository : JpaRepository<ReservationSeat, Long>

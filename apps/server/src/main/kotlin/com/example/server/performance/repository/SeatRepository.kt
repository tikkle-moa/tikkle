package com.example.server.performance.repository

import com.example.server.performance.entity.Seat
import org.springframework.data.jpa.repository.JpaRepository

interface SeatRepository : JpaRepository<Seat, Long> {
  fun findAllByPerformanceId(performanceId: Long): List<Seat>
}

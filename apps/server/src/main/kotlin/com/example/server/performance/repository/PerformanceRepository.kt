package com.example.server.performance.repository

import com.example.server.concert.entity.Concert
import com.example.server.performance.entity.Performance
import org.springframework.data.jpa.repository.JpaRepository

interface PerformanceRepository : JpaRepository<Performance, Long> {
  fun findAllByConcertOrderByStartsAt(concert: Concert): List<Performance>
}

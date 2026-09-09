package com.example.server.performance

interface PerformanceSeatEventPublisher {
  fun publishHoldReleased(performanceId: Long, seatIds: List<Long>)
}

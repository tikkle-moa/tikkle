package com.example.server.performance.dto

data class PerformanceDetailResponse(val performance: PerformanceResponse, val seats: List<SeatResponse>)

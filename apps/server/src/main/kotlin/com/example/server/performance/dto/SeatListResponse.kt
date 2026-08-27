package com.example.server.performance.dto

import java.time.LocalDateTime

data class SeatListResponse(val serverTime: LocalDateTime, val seats: List<SeatResponse>)

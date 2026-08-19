package com.example.server.concert.dto

import com.example.server.performance.dto.PerformanceResponse

data class ConcertDetailResponse(val concert: ConcertResponse, val performances: List<PerformanceResponse>)

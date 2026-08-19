package com.example.server.concert.dto

data class ConcertDetailResponse(val concert: ConcertResponse, val performances: List<PerformanceResponse>)

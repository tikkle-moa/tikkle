package com.example.server.performance

import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.dto.UpdatePerformanceRequest
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PerformanceService(private val concertRepository: ConcertRepository, private val performanceRepository: PerformanceRepository) {
  @Transactional
  fun create(createPerformanceRequest: CreatePerformanceRequest): PerformanceResponse {
    requireBookingOpensBeforeStarts(
      bookingOpensAt = createPerformanceRequest.bookingOpensAt,
      startsAt = createPerformanceRequest.startsAt,
    )

    val concert = concertRepository.findById(createPerformanceRequest.concertId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "콘서트를 찾을 수 없습니다.") }

    val performance = Performance(
      concert = concert,
      startsAt = createPerformanceRequest.startsAt,
      bookingOpensAt = createPerformanceRequest.bookingOpensAt,
    )

    return PerformanceResponse.from(performanceRepository.save(performance))
  }

  @Transactional
  fun update(id: Long, updatePerformanceRequest: UpdatePerformanceRequest): PerformanceResponse {
    val performance = performanceRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    val startsAt = if (updatePerformanceRequest.startsAt.isPresent) {
      updatePerformanceRequest.startsAt.get()
    } else {
      performance.startsAt
    }
    val bookingOpensAt = if (updatePerformanceRequest.bookingOpensAt.isPresent) {
      updatePerformanceRequest.bookingOpensAt.get()
    } else {
      performance.bookingOpensAt
    }

    bookingOpensAt?.let {
      requireBookingOpensBeforeStarts(
        bookingOpensAt = it,
        startsAt = startsAt,
      )
    }

    updatePerformanceRequest.concertId.ifPresent { concertId ->
      performance.concert = concertRepository.findById(concertId)
        .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "콘서트를 찾을 수 없습니다.") }
    }
    performance.startsAt = startsAt
    performance.bookingOpensAt = bookingOpensAt

    return PerformanceResponse.from(performance)
  }

  private fun requireBookingOpensBeforeStarts(bookingOpensAt: java.time.LocalDateTime, startsAt: java.time.LocalDateTime) {
    if (!bookingOpensAt.isBefore(startsAt)) {
      throw CustomException(
        ErrorCode.BAD_REQUEST,
        "예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.",
      )
    }
  }
}

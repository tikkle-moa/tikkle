package com.example.server.performance

import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.PerformanceDetailResponse
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.dto.UpdatePerformanceRequest
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class PerformanceService(private val concertRepository: ConcertRepository, private val performanceRepository: PerformanceRepository) {
  @Transactional(readOnly = true)
  fun getPerformances(): List<PerformanceResponse> {
    val performances = performanceRepository.findAllUpcomingFirstOrderByStartsAtAsc()

    return performances.map(PerformanceResponse::from)
  }

  @Transactional(readOnly = true)
  fun getPerformance(id: Long): PerformanceDetailResponse {
    val performance = performanceRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    return PerformanceDetailResponse(
      performance = PerformanceResponse.from(performance),
      seats = emptyList(),
    )
  }

  @Transactional
  fun create(createPerformanceRequest: CreatePerformanceRequest): PerformanceResponse {
    createPerformanceRequest.bookingOpensAt?.let {
      requireBookingOpensBeforeStarts(
        bookingOpensAt = it,
        startsAt = createPerformanceRequest.startsAt,
      )
    }

    val concert = concertRepository.findById(createPerformanceRequest.concertId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "콘서트를 찾을 수 없습니다.") }

    val performance = Performance(
      concert = concert,
      name = createPerformanceRequest.name,
      startsAt = createPerformanceRequest.startsAt,
      bookingOpensAt = createPerformanceRequest.bookingOpensAt,
    )

    return PerformanceResponse.from(performanceRepository.save(performance))
  }

  @Transactional
  fun update(id: Long, updatePerformanceRequest: UpdatePerformanceRequest): PerformanceResponse {
    val performance = performanceRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    val name = updatePerformanceRequest.name.orElse(performance.name)
    val startsAt = updatePerformanceRequest.startsAt.orElse(performance.startsAt)
    val bookingOpensAt = updatePerformanceRequest.bookingOpensAt.orElse(performance.bookingOpensAt)

    bookingOpensAt?.let {
      requireBookingOpensBeforeStarts(
        bookingOpensAt = it,
        startsAt = startsAt,
      )
    }

    performance.name = name
    performance.startsAt = startsAt
    performance.bookingOpensAt = bookingOpensAt

    return PerformanceResponse.from(performance)
  }

  @Transactional
  fun delete(id: Long) {
    val performance = performanceRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    performanceRepository.delete(performance)
  }

  private fun requireBookingOpensBeforeStarts(bookingOpensAt: LocalDateTime, startsAt: LocalDateTime) {
    if (!bookingOpensAt.isBefore(startsAt)) {
      throw CustomException(
        ErrorCode.BAD_REQUEST,
        "예매 시작 시각은 공연 시작 시각보다 이전이어야 합니다.",
      )
    }
  }
}

package com.example.server.performance

import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.ApplySeatChangesRequest
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.PerformanceDetailResponse
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.dto.SeatResponse
import com.example.server.performance.dto.UpdatePerformanceRequest
import com.example.server.performance.entity.Performance
import com.example.server.performance.entity.Seat
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.performance.repository.SeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class PerformanceService(
  private val concertRepository: ConcertRepository,
  private val performanceRepository: PerformanceRepository,
  private val seatRepository: SeatRepository,
) {
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
  fun applySeatChanges(performanceId: Long, request: ApplySeatChangesRequest): List<SeatResponse> {
    val performance = performanceRepository.findById(performanceId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    val requestedIds = request.seats.mapNotNull { it.id }
    if (requestedIds.size != requestedIds.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 좌석 ID가 포함되어 있습니다.")
    }
    if (request.deletedSeatIds.size != request.deletedSeatIds.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 삭제 좌석 ID가 포함되어 있습니다.")
    }

    if (requestedIds.any(request.deletedSeatIds::contains)) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 좌석을 수정하고 삭제할 수 없습니다.")
    }

    val currentSeats = seatRepository.findAllByPerformanceId(performanceId)
    val currentSeatsById = currentSeats.associateBy { it.id }
    if (!currentSeatsById.keys.containsAll(requestedIds + request.deletedSeatIds)) {
      throw CustomException(ErrorCode.NOT_FOUND, "변경할 좌석을 찾을 수 없습니다.")
    }

    val seatKeys = request.seats.map { it.sectionName to it.seatNumber }
    val changedSeatIds = (requestedIds + request.deletedSeatIds).toSet()
    val unchangedSeatKeys = currentSeats
      .filterNot { it.id in changedSeatIds }
      .map { it.sectionName to it.seatNumber }
    val resultingSeatKeys = unchangedSeatKeys + seatKeys
    if (resultingSeatKeys.size != resultingSeatKeys.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 구역의 좌석 번호가 중복되었습니다.")
    }

    val seats = request.seats.map { seatRequest ->
      seatRequest.id?.let { id ->
        currentSeatsById.getValue(id).apply {
          sectionName = seatRequest.sectionName
          seatNumber = seatRequest.seatNumber
          seatLabel = seatRequest.seatLabel
          price = seatRequest.price
          positionX = seatRequest.positionX
          positionY = seatRequest.positionY
        }
      } ?: Seat(
        performance = performance,
        sectionName = seatRequest.sectionName,
        seatNumber = seatRequest.seatNumber,
        seatLabel = seatRequest.seatLabel,
        price = seatRequest.price,
        positionX = seatRequest.positionX,
        positionY = seatRequest.positionY,
      )
    }

    val seatsToDelete = request.deletedSeatIds.map(currentSeatsById::getValue)
    if (seatsToDelete.isNotEmpty()) {
      seatRepository.deleteAll(seatsToDelete)
      seatRepository.flush()
    }
    seatRepository.saveAll(seats)

    val updatedSeats = seatRepository.findAllByPerformanceId(performanceId)
    return updatedSeats.map(SeatResponse::from)
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

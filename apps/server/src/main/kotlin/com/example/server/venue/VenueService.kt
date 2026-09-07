package com.example.server.venue

import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.venue.dto.CreateVenueDetailRequest
import com.example.server.venue.dto.UpdateVenueDetailRequest
import com.example.server.venue.dto.VenueDetailResponse
import com.example.server.venue.dto.VenueListResponse
import com.example.server.venue.dto.VenueResponse
import com.example.server.venue.dto.VenueSeatResponse
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import kotlin.collections.distinct
import kotlin.collections.plus

@Service
class VenueService(
  private val venueRepository: VenueRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val concertRepository: ConcertRepository,
) {
  private companion object {
    const val SEAT_WIDTH = "4.50"
    const val SEAT_HEIGHT = "3.50"
  }

  @Transactional(readOnly = true)
  fun getAllVenues(): List<VenueListResponse> {
    val venues = venueRepository.findAll()
    val venueSeatCountMap = venueSeatRepository.countGroupByVenueId().associate { it.venueId to it.count }
    val concertCountMap = concertRepository.countGroupByVenueId().associate { it.venueId to it.count }

    return venues.map { venue ->
      VenueListResponse.from(venue = venue, venueSeatCount = venueSeatCountMap[venue.id] ?: 0L, concertCount = concertCountMap[venue.id] ?: 0L)
    }
  }

  @Transactional(readOnly = true)
  fun getVenueDetails(venueId: Long): VenueDetailResponse {
    val venue = venueRepository.findById(venueId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "장소를 찾을 수 없습니다.") }
    val venueSeats = venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(venueId)

    return VenueDetailResponse(
      venue = VenueResponse.from(venue),
      venueSeats = venueSeats.map(VenueSeatResponse::from),
    )
  }

  @Transactional
  fun createVenueDetails(request: CreateVenueDetailRequest): VenueDetailResponse {
    val stagePositionX = request.venue.stagePositionX
    val stagePositionY = request.venue.stagePositionY
    val stageWidth = request.venue.stageWidth
    val stageHeight = request.venue.stageHeight

    validateStagePosition(request.venue.width, request.venue.height, stagePositionX, stagePositionY, stageWidth, stageHeight)
    val seatKeys = request.venueSeats.map { it.sectionName.trim() to it.seatNumber }
    if (seatKeys.size != seatKeys.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 구역의 좌석 번호가 중복되었습니다.")
    }

    val seatPositions = request.venueSeats.map { it.positionX to it.positionY }
    validateSeatLayout(
      seatPositions,
      request.venue.width,
      request.venue.height,
      stagePositionX,
      stagePositionY,
      stageWidth,
      stageHeight,
    )

    val savedVenue = venueRepository.save(
      Venue(
        name = request.venue.name,
        address = request.venue.address,
        description = request.venue.description,
        width = request.venue.width,
        height = request.venue.height,
        stagePositionX = stagePositionX,
        stagePositionY = stagePositionY,
        stageWidth = stageWidth,
        stageHeight = stageHeight,
      ),
    )

    val venueSeats = request.venueSeats.map { seatRequest ->
      VenueSeat(
        venue = savedVenue,
        sectionName = seatRequest.sectionName.trim(),
        seatNumber = seatRequest.seatNumber,
        seatLabel = seatRequest.seatLabel,
        price = seatRequest.price,
        positionX = seatRequest.positionX,
        positionY = seatRequest.positionY,
      )
    }
    venueSeatRepository.saveAll(venueSeats)

    return VenueDetailResponse(
      venue = VenueResponse.from(savedVenue),
      venueSeats = venueSeats.map(VenueSeatResponse::from),
    )
  }

  @Transactional
  fun updateVenueDetails(venueId: Long, request: UpdateVenueDetailRequest): VenueDetailResponse {
    val venue = venueRepository.findById(venueId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "장소를 찾을 수 없습니다.") }

    val requestedSeats = request.venueSeats.orElse(emptyList())
    val requestedIds = requestedSeats.mapNotNull { it.id.orElse(null) }
    val deletedSelectedIds = request.deletedVenueSeatIds.orElse(emptyList())
    if (requestedIds.size != requestedIds.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 좌석 ID가 포함되어 있습니다.")
    }
    if (deletedSelectedIds.size != deletedSelectedIds.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 삭제 좌석 ID가 포함되어 있습니다.")
    }

    if (requestedIds.any(deletedSelectedIds::contains)) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 좌석을 수정하고 삭제할 수 없습니다.")
    }

    val currentVenueSeats = venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(venueId)
    val currentVenueSeatById = currentVenueSeats.associateBy { it.id }
    if (!currentVenueSeatById.keys.containsAll(requestedIds + deletedSelectedIds)) {
      throw CustomException(ErrorCode.NOT_FOUND, "변경할 좌석을 찾을 수 없습니다.")
    }

    val changedSeatIds = requestedIds + deletedSelectedIds
    val unchangedSeats = currentVenueSeats.filterNot { it.id in changedSeatIds }

    val unchangedSeatKeys = unchangedSeats.map { it.sectionName.trim() to it.seatNumber }
    val requestedSeatKeys = requestedSeats.map { it.sectionName.trim() to it.seatNumber }
    val resultingSeatKeys = unchangedSeatKeys + requestedSeatKeys
    if (resultingSeatKeys.size != resultingSeatKeys.toSet().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 구역의 좌석 번호가 중복되었습니다.")
    }

    val requestedVenue = request.venue.orElse(null)
    val stagePositionX = requestedVenue?.stagePositionX?.orElse(venue.stagePositionX) ?: venue.stagePositionX
    val stagePositionY = requestedVenue?.stagePositionY?.orElse(venue.stagePositionY) ?: venue.stagePositionY
    val stageWidth = requestedVenue?.stageWidth?.orElse(venue.stageWidth) ?: venue.stageWidth
    val stageHeight = requestedVenue?.stageHeight?.orElse(venue.stageHeight) ?: venue.stageHeight
    val venueWidth = requestedVenue?.width?.orElse(venue.width) ?: venue.width
    val venueHeight = requestedVenue?.height?.orElse(venue.height) ?: venue.height

    if (requestedVenue != null) {
      validateStagePosition(venueWidth, venueHeight, stagePositionX, stagePositionY, stageWidth, stageHeight)
    }

    val unchangedSeatPositions = unchangedSeats.map { it.positionX to it.positionY }
    val requestedSeatPositions = requestedSeats.map { it.positionX to it.positionY }
    validateSeatLayout(
      unchangedSeatPositions + requestedSeatPositions,
      venueWidth,
      venueHeight,
      stagePositionX,
      stagePositionY,
      stageWidth,
      stageHeight,
    )

    val venueSeats = requestedSeats.map { seatRequest ->
      seatRequest.id.orElse(null)?.let { id ->
        currentVenueSeatById.getValue(id).apply {
          sectionName = seatRequest.sectionName.trim()
          seatNumber = seatRequest.seatNumber
          seatLabel = seatRequest.seatLabel
          price = seatRequest.price
          positionX = seatRequest.positionX
          positionY = seatRequest.positionY
        }
      } ?: VenueSeat(
        venue = venue,
        sectionName = seatRequest.sectionName.trim(),
        seatNumber = seatRequest.seatNumber,
        seatLabel = seatRequest.seatLabel,
        price = seatRequest.price,
        positionX = seatRequest.positionX,
        positionY = seatRequest.positionY,
      )
    }

    val seatsToDelete = deletedSelectedIds.map(currentVenueSeatById::getValue)
    if (seatsToDelete.isNotEmpty()) {
      venueSeatRepository.deleteAll(seatsToDelete)
      venueSeatRepository.flush()
    }
    venueSeatRepository.saveAll(venueSeats)

    requestedVenue?.applyTo(venue)
    venueRepository.save(venue)

    val updatedSeats = venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(venueId)
    return VenueDetailResponse(
      venue = VenueResponse.from(venue),
      venueSeats = updatedSeats.map(VenueSeatResponse::from),
    )
  }

  @Transactional
  fun deleteVenue(venueId: Long) {
    val venue = venueRepository.findById(venueId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "장소를 찾을 수 없습니다.") }

    if (concertRepository.existsByVenueId(venueId)) {
      throw CustomException(ErrorCode.CONFLICT, "공연이 등록된 장소는 삭제할 수 없습니다.")
    }

    venueSeatRepository.deleteAllByVenueId(venueId)
    venueRepository.delete(venue)
  }

  private fun validateStagePosition(
    venueWidth: BigDecimal,
    venueHeight: BigDecimal,
    stagePositionX: BigDecimal,
    stagePositionY: BigDecimal,
    stageWidth: BigDecimal,
    stageHeight: BigDecimal,
  ) {
    val halfStageWidth = stageWidth.divide(BigDecimal(2))
    val halfStageHeight = stageHeight.divide(BigDecimal(2))
    val leftTopX = stagePositionX.subtract(halfStageWidth)
    val leftTopY = stagePositionY.subtract(halfStageHeight)
    val rightBottomX = stagePositionX.add(halfStageWidth)
    val rightBottomY = stagePositionY.add(halfStageHeight)

    if (leftTopX < BigDecimal.ZERO || leftTopY < BigDecimal.ZERO || rightBottomX > venueWidth || rightBottomY > venueHeight) {
      throw CustomException(ErrorCode.BAD_REQUEST, "무대가 장소의 범위를 벗어났습니다.")
    }
  }

  private fun validateSeatLayout(
    seatPositions: List<Pair<BigDecimal, BigDecimal>>,
    venueWidth: BigDecimal,
    venueHeight: BigDecimal,
    stagePositionX: BigDecimal,
    stagePositionY: BigDecimal,
    stageWidth: BigDecimal,
    stageHeight: BigDecimal,
  ) {
    val seatWidth = BigDecimal(SEAT_WIDTH)
    val seatHeight = BigDecimal(SEAT_HEIGHT)
    val halfSeatWidth = seatWidth.divide(BigDecimal(2))
    val halfSeatHeight = seatHeight.divide(BigDecimal(2))
    val halfStageWidth = stageWidth.divide(BigDecimal(2))
    val halfStageHeight = stageHeight.divide(BigDecimal(2))
    val seatGrid = mutableMapOf<Pair<Int, Int>, MutableList<Pair<BigDecimal, BigDecimal>>>()

    seatPositions.forEach { (seatX, seatY) ->
      if (
        seatX - halfSeatWidth < BigDecimal.ZERO ||
        seatY - halfSeatHeight < BigDecimal.ZERO ||
        seatX + halfSeatWidth > venueWidth ||
        seatY + halfSeatHeight > venueHeight
      ) {
        throw CustomException(ErrorCode.BAD_REQUEST, "좌석 영역이 장소의 범위를 벗어났습니다.")
      }

      if (
        seatX.subtract(stagePositionX).abs() < halfSeatWidth + halfStageWidth &&
        seatY.subtract(stagePositionY).abs() < halfSeatHeight + halfStageHeight
      ) {
        throw CustomException(ErrorCode.BAD_REQUEST, "좌석 영역이 무대와 겹칩니다.")
      }

      val gridX = seatX.divide(seatWidth, 0, RoundingMode.FLOOR).toInt()
      val gridY = seatY.divide(seatHeight, 0, RoundingMode.FLOOR).toInt()
      for (offsetX in -1..1) {
        for (offsetY in -1..1) {
          seatGrid[gridX + offsetX to gridY + offsetY]?.forEach { (nearbyX, nearbyY) ->
            if (seatX.subtract(nearbyX).abs() < seatWidth && seatY.subtract(nearbyY).abs() < seatHeight) {
              throw CustomException(ErrorCode.BAD_REQUEST, "좌석 영역이 중복되었습니다.")
            }
          }
        }
      }

      seatGrid.getOrPut(gridX to gridY) { mutableListOf() }.add(seatX to seatY)
    }
  }
}

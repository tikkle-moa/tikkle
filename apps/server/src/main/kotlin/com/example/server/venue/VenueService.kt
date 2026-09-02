package com.example.server.venue

import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.venue.dto.CreateVenueDetailRequest
import com.example.server.venue.dto.UpdateVenueDetailRequest
import com.example.server.venue.dto.VenueDetailResponse
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
  @Transactional(readOnly = true)
  fun getAllVenues(): List<VenueResponse> {
    val venues = venueRepository.findAll()
    return venues.map(VenueResponse::from)
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
    val seatKeys = request.venueSeats.map { it.sectionName to it.seatNumber }
    if (seatKeys.size != seatKeys.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 구역의 좌석 번호가 중복되었습니다.")
    }

    val seatPositions = request.venueSeats.map { it.positionX.setScale(2) to it.positionY.setScale(2) }
    if (seatPositions.size != seatPositions.distinct().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 좌표의 좌석이 중복되었습니다.")
    }

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
        sectionName = seatRequest.sectionName,
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

    val requestedIds = request.venueSeats?.mapNotNull { it.id } ?: emptyList()
    val deletedSelectedIds = request.deletedSeatIds ?: emptyList()
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

    val requestedSeats = request.venueSeats.orEmpty()
    val changedSeatIds = requestedIds + deletedSelectedIds
    val unchangedSeats = currentVenueSeats.filterNot { it.id in changedSeatIds }

    val unchangedSeatKeys = unchangedSeats.map { it.sectionName.trim() to it.seatNumber }
    val requestedSeatKeys = requestedSeats.map { it.sectionName.trim() to it.seatNumber }
    val resultingSeatKeys = unchangedSeatKeys + requestedSeatKeys
    if (resultingSeatKeys.size != resultingSeatKeys.toSet().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 구역의 좌석 번호가 중복되었습니다.")
    }

    val unchangedSeatPositions = unchangedSeats.map { it.positionX.setScale(2) to it.positionY.setScale(2) }
    val requestedSeatPositions = requestedSeats.map { it.positionX.setScale(2) to it.positionY.setScale(2) }
    val resultingSeatPositions = unchangedSeatPositions + requestedSeatPositions
    if (resultingSeatPositions.size != resultingSeatPositions.toSet().size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "같은 좌표의 좌석이 중복되었습니다.")
    }

    if (request.venue != null) {
      val stagePositionX = request.venue.stagePositionX.orElse(venue.stagePositionX)
      val stagePositionY = request.venue.stagePositionY.orElse(venue.stagePositionY)
      val stageWidth = request.venue.stageWidth.orElse(venue.stageWidth)
      val stageHeight = request.venue.stageHeight.orElse(venue.stageHeight)
      val venueWidth = request.venue.width.orElse(venue.width)
      val venueHeight = request.venue.height.orElse(venue.height)

      validateStagePosition(venueWidth, venueHeight, stagePositionX, stagePositionY, stageWidth, stageHeight)
    }

    val venueSeats = request.venueSeats?.map { seatRequest ->
      seatRequest.id?.let { id ->
        currentVenueSeatById.getValue(id).apply {
          sectionName = seatRequest.sectionName
          seatNumber = seatRequest.seatNumber
          seatLabel = seatRequest.seatLabel
          price = seatRequest.price
          positionX = seatRequest.positionX
          positionY = seatRequest.positionY
        }
      } ?: VenueSeat(
        venue = venue,
        sectionName = seatRequest.sectionName,
        seatNumber = seatRequest.seatNumber,
        seatLabel = seatRequest.seatLabel,
        price = seatRequest.price,
        positionX = seatRequest.positionX,
        positionY = seatRequest.positionY,
      )
    } ?: emptyList()

    val seatsToDelete = deletedSelectedIds.map(currentVenueSeatById::getValue)
    if (seatsToDelete.isNotEmpty()) {
      venueSeatRepository.deleteAll(seatsToDelete)
      venueSeatRepository.flush()
    }
    venueSeatRepository.saveAll(venueSeats)

    request.venue?.applyTo(venue)
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
    val leftTopX = stagePositionX.subtract(stageWidth.divide(BigDecimal(2), 2, RoundingMode.HALF_UP))
    val leftTopY = stagePositionY.subtract(stageHeight.divide(BigDecimal(2), 2, RoundingMode.HALF_UP))
    val rightBottomX = stagePositionX.add(stageWidth.divide(BigDecimal(2), 2, RoundingMode.HALF_UP))
    val rightBottomY = stagePositionY.add(stageHeight.divide(BigDecimal(2), 2, RoundingMode.HALF_UP))

    if (leftTopX < BigDecimal.ZERO || leftTopY < BigDecimal.ZERO || rightBottomX > venueWidth || rightBottomY > venueHeight) {
      throw CustomException(ErrorCode.BAD_REQUEST, "무대가 장소의 범위를 벗어났습니다.")
    }
  }
}

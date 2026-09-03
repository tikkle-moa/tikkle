package com.example.server.venue

import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.venue.dto.CreateVenueDetailRequest
import com.example.server.venue.dto.CreateVenueRequest
import com.example.server.venue.dto.CreateVenueSeatRequest
import com.example.server.venue.dto.UpdateVenueDetailRequest
import com.example.server.venue.dto.UpdateVenueRequest
import com.example.server.venue.dto.UpdateVenueSeatRequest
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.inOrder
import org.mockito.junit.jupiter.MockitoExtension
import org.openapitools.jackson.nullable.JsonNullable
import java.math.BigDecimal
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class VenueServiceTest {
  @Mock
  lateinit var venueRepository: VenueRepository

  @Mock
  lateinit var venueSeatRepository: VenueSeatRepository

  @Mock
  lateinit var concertRepository: ConcertRepository

  @InjectMocks
  lateinit var venueService: VenueService

  @Nested
  @DisplayName("getAllVenues")
  inner class GetAllVenues {
    @Test
    fun `전체 공연장을 응답으로 변환한다`() {
      given(venueRepository.findAll()).willReturn(listOf(venue(1L), venue(2L)))

      val result = venueService.getAllVenues()

      assertThat(result.map { it.id }).containsExactly(1L, 2L)
      then(venueRepository).should().findAll()
    }
  }

  @Nested
  @DisplayName("getVenueDetails")
  inner class GetVenueDetails {
    @Test
    fun `공연장과 좌석 상세를 반환한다`() {
      val venue = venue(1L)
      val seats = listOf(venueSeat(1L, venue), venueSeat(2L, venue, seatNumber = 2))
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L)).willReturn(seats)

      val result = venueService.getVenueDetails(1L)

      assertThat(result.venue.id).isEqualTo(1L)
      assertThat(result.venueSeats.map { it.id }).containsExactly(1L, 2L)
    }

    @Test
    fun `공연장이 없으면 NOT_FOUND 예외가 발생한다`() {
      given(venueRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> { venueService.getVenueDetails(99L) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      then(venueSeatRepository).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("createVenueDetails")
  inner class CreateVenueDetails {
    @Test
    fun `공연장과 좌석을 생성한다`() {
      val request = createRequest()
      given(venueRepository.save(any(Venue::class.java))).willAnswer { invocation ->
        invocation.getArgument<Venue>(0).apply { id = 1L }
      }

      val result = venueService.createVenueDetails(request)

      assertThat(result.venue.id).isEqualTo(1L)
      assertThat(result.venue.name).isEqualTo(request.venue.name)
      assertThat(result.venueSeats).hasSize(1)
      assertThat(result.venueSeats.single().venueId).isEqualTo(1L)
      then(venueSeatRepository).should().saveAll(any<List<VenueSeat>>())
    }

    @Test
    fun `무대가 공연장 범위를 벗어나면 생성하지 않는다`() {
      val request = createRequest().copy(
        venue = createRequest().venue.copy(stagePositionX = BigDecimal("80.01")),
      )

      val exception = assertThrows<CustomException> { venueService.createVenueDetails(request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      then(venueRepository).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `무대의 각 경계가 공연장 범위를 벗어나면 생성하지 않는다`() {
      val baseVenue = createRequest().venue
      val invalidVenues = listOf(
        baseVenue.copy(stagePositionX = BigDecimal("19.99")),
        baseVenue.copy(stagePositionY = BigDecimal("9.99")),
        baseVenue.copy(stagePositionX = BigDecimal("80.01")),
        baseVenue.copy(stagePositionY = BigDecimal("90.01")),
      )

      invalidVenues.forEach { invalidVenue ->
        val exception = assertThrows<CustomException> {
          venueService.createVenueDetails(
            CreateVenueDetailRequest(venue = invalidVenue, venueSeats = createRequest().venueSeats),
          )
        }
        assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      }

      then(venueRepository).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `같은 구역의 좌석 번호가 중복되면 생성하지 않는다`() {
      val request = createRequest()
      val duplicatedSeat = request.venueSeats.single().copy(seatLabel = "중복 좌석")
      val duplicatedRequest = request.copy(venueSeats = request.venueSeats + duplicatedSeat)

      val exception = assertThrows<CustomException> {
        venueService.createVenueDetails(duplicatedRequest)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception.message).contains("같은 구역의 좌석 번호가 중복되었습니다.")
      then(venueRepository).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `좌석 렌더링 영역이 겹치면 생성하지 않는다`() {
      val request = createRequest()
      val duplicatedPositionSeat = request.venueSeats.single().copy(
        sectionName = "B구역",
        seatNumber = 2,
        seatLabel = "B구역 2번",
        positionX = BigDecimal("14.49"),
        positionY = BigDecimal("33.49"),
      )
      val duplicatedRequest = request.copy(venueSeats = request.venueSeats + duplicatedPositionSeat)

      val exception = assertThrows<CustomException> {
        venueService.createVenueDetails(duplicatedRequest)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception.message).contains("좌석 영역이 중복되었습니다.")
      then(venueRepository).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `좌석 영역의 경계만 맞닿으면 생성할 수 있다`() {
      val request = createRequest()
      val firstSeat = request.venueSeats.single()
      val seats = listOf(
        firstSeat,
        firstSeat.copy(
          sectionName = "B구역",
          seatNumber = 2,
          seatLabel = "B구역 2번",
          positionX = firstSeat.positionX.add(BigDecimal("4.50")),
        ),
        firstSeat.copy(
          sectionName = "C구역",
          seatNumber = 3,
          seatLabel = "C구역 3번",
          positionY = firstSeat.positionY.add(BigDecimal("3.50")),
        ),
      )
      given(venueRepository.save(any(Venue::class.java))).willAnswer { invocation ->
        invocation.getArgument<Venue>(0).apply { id = 1L }
      }

      val result = venueService.createVenueDetails(request.copy(venueSeats = seats))

      assertThat(result.venueSeats).hasSize(3)
      then(venueSeatRepository).should().saveAll(any<List<VenueSeat>>())
    }

    @Test
    fun `좌석 영역이 공연장 경계를 벗어나면 생성하지 않는다`() {
      val request = createRequest()
      val invalidPositions = listOf(
        BigDecimal("2.24") to BigDecimal("30.00"),
        BigDecimal("97.76") to BigDecimal("30.00"),
        BigDecimal("10.00") to BigDecimal("1.74"),
        BigDecimal("10.00") to BigDecimal("98.26"),
      )

      invalidPositions.forEach { (positionX, positionY) ->
        val exception = assertThrows<CustomException> {
          venueService.createVenueDetails(
            request.copy(venueSeats = listOf(request.venueSeats.single().copy(positionX = positionX, positionY = positionY))),
          )
        }

        assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
        assertThat(exception.message).contains("좌석 영역이 장소의 범위를 벗어났습니다.")
      }
    }

    @Test
    fun `좌석 영역이 무대와 겹치면 생성하지 않는다`() {
      val request = createRequest()
      val seatOnStage = request.venueSeats.single().copy(positionX = BigDecimal("20.00"), positionY = BigDecimal("10.00"))

      val exception = assertThrows<CustomException> {
        venueService.createVenueDetails(request.copy(venueSeats = listOf(seatOnStage)))
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception.message).contains("좌석 영역이 무대와 겹칩니다.")
    }

    @Test
    fun `좌석 영역이 공연장과 무대 경계에 맞닿으면 생성할 수 있다`() {
      val request = createRequest()
      val seats = listOf(
        request.venueSeats.single().copy(positionX = BigDecimal("2.25"), positionY = BigDecimal("21.75")),
        request.venueSeats.single().copy(
          sectionName = "B구역",
          seatNumber = 2,
          seatLabel = "B구역 2번",
          positionX = BigDecimal("97.75"),
          positionY = BigDecimal("98.25"),
        ),
      )
      given(venueRepository.save(any(Venue::class.java))).willAnswer { invocation ->
        invocation.getArgument<Venue>(0).apply { id = 1L }
      }

      val result = venueService.createVenueDetails(request.copy(venueSeats = seats))

      assertThat(result.venueSeats).hasSize(2)
    }
  }

  @Nested
  @DisplayName("updateVenueDetails")
  inner class UpdateVenueDetails {
    @Test
    fun `공연장 정보와 좌석 추가 수정 삭제를 반영한다`() {
      val venue = venue(1L)
      val existingSeat = venueSeat(10L, venue)
      val updatedSeatRequest = updateSeatRequest(id = 10L, seatLabel = "수정 좌석")
      val newSeatRequest = updateSeatRequest(
        id = null,
        seatNumber = 2,
        seatLabel = "신규 좌석",
        positionX = BigDecimal("30.00"),
      )
      val request = updateRequest(
        venue = UpdateVenueRequest(name = JsonNullable.of("수정 공연장")),
        venueSeats = listOf(updatedSeatRequest, newSeatRequest),
      )
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L))
        .willReturn(listOf(existingSeat), listOf(existingSeat))

      val result = venueService.updateVenueDetails(1L, request)

      assertThat(venue.name).isEqualTo("수정 공연장")
      assertThat(existingSeat.seatLabel).isEqualTo("수정 좌석")
      assertThat(result.venue.name).isEqualTo("수정 공연장")
      then(venueSeatRepository).should().saveAll(any<List<VenueSeat>>())
      then(venueRepository).should().save(venue)
    }

    @Test
    fun `삭제할 좌석을 제거한다`() {
      val venue = venue(1L)
      val seat = venueSeat(10L, venue)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L))
        .willReturn(listOf(seat), emptyList())

      venueService.updateVenueDetails(1L, updateRequest(deletedVenueSeatIds = listOf(10L)))

      then(venueSeatRepository).should().deleteAll(listOf(seat))
      then(venueSeatRepository).should().flush()
    }

    @Test
    fun `수정 좌석 ID가 중복되면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      val request = updateRequest(
        venueSeats = listOf(updateSeatRequest(10L), updateSeatRequest(10L, seatNumber = 2)),
      )

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }

    @Test
    fun `삭제 좌석 ID가 중복되면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))

      val exception = assertThrows<CustomException> {
        venueService.updateVenueDetails(
          1L,
          updateRequest(deletedVenueSeatIds = listOf(10L, 10L)),
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }

    @Test
    fun `같은 좌석을 수정하고 삭제하면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      val request = updateRequest(
        venueSeats = listOf(updateSeatRequest(10L)),
        deletedVenueSeatIds = listOf(10L),
      )

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }

    @Test
    fun `요청한 좌석이 공연장에 없으면 NOT_FOUND 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L)).willReturn(emptyList())

      val exception = assertThrows<CustomException> {
        venueService.updateVenueDetails(1L, updateRequest(venueSeats = listOf(updateSeatRequest(10L))))
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }

    @Test
    fun `변경 결과 좌석 번호가 중복되면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      val unchangedSeat = venueSeat(10L, venue, seatNumber = 1)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L))
        .willReturn(listOf(unchangedSeat))
      val request = updateRequest(venueSeats = listOf(updateSeatRequest(id = null, seatNumber = 1)))

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }

    @Test
    fun `변경 결과 좌석 렌더링 영역이 겹치면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      val unchangedSeat = venueSeat(10L, venue)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L))
        .willReturn(listOf(unchangedSeat))
      val request = updateRequest(
        venueSeats = listOf(
          updateSeatRequest(
            id = null,
            seatNumber = 2,
            positionX = BigDecimal("14.49"),
            positionY = BigDecimal("33.49"),
          ),
        ),
      )

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception.message).contains("좌석 영역이 중복되었습니다.")
      then(venueSeatRepository).should().findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L)
      then(venueSeatRepository).shouldHaveNoMoreInteractions()
      then(venueRepository).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `변경 결과 좌석 영역이 공연장 밖이면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L)).willReturn(emptyList())
      val request = updateRequest(
        venueSeats = listOf(updateSeatRequest(id = null, positionX = BigDecimal("2.24"))),
      )

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception.message).contains("좌석 영역이 장소의 범위를 벗어났습니다.")
    }

    @Test
    fun `변경 결과 좌석 영역이 무대와 겹치면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L)).willReturn(emptyList())
      val request = updateRequest(
        venueSeats = listOf(updateSeatRequest(id = null, positionX = BigDecimal("20.00"), positionY = BigDecimal("5.00"))),
      )

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception.message).contains("좌석 영역이 무대와 겹칩니다.")
    }

    @Test
    fun `공연장이 없으면 NOT_FOUND 예외가 발생한다`() {
      given(venueRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        venueService.updateVenueDetails(99L, updateRequest())
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }

    @Test
    fun `수정된 무대가 공연장 범위를 벗어나면 BAD_REQUEST 예외가 발생한다`() {
      val venue = venue(1L)
      given(venueRepository.findById(1L)).willReturn(Optional.of(venue))
      given(venueSeatRepository.findAllByVenueIdOrderBySectionNameAscSeatNumberAsc(1L)).willReturn(emptyList())
      val request = updateRequest(
        venue = UpdateVenueRequest(stagePositionX = JsonNullable.of(BigDecimal("90.00"))),
      )

      val exception = assertThrows<CustomException> { venueService.updateVenueDetails(1L, request) }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      then(venueRepository).shouldHaveNoMoreInteractions()
    }
  }

  @Nested
  @DisplayName("deleteVenue")
  inner class DeleteVenue {
    @Test
    fun `공연장이 존재하면 공연장과 소속 좌석을 삭제한다`() {
      val venueId = 1L
      val venue = venue(id = venueId)
      given(venueRepository.findById(venueId)).willReturn(Optional.of(venue))

      venueService.deleteVenue(venueId)

      val order = inOrder(venueSeatRepository, venueRepository)
      order.verify(venueSeatRepository).deleteAllByVenueId(venueId)
      order.verify(venueRepository).delete(venue)
    }

    @Test
    fun `콘서트가 등록된 공연장은 CONFLICT 예외가 발생하고 삭제하지 않는다`() {
      val venueId = 1L
      given(venueRepository.findById(venueId)).willReturn(Optional.of(venue(venueId)))
      given(concertRepository.existsByVenueId(venueId)).willReturn(true)

      val exception = assertThrows<CustomException> {
        venueService.deleteVenue(venueId)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(venueRepository).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `공연장이 존재하지 않으면 예외가 발생하고 삭제하지 않는다`() {
      val venueId = 99L
      given(venueRepository.findById(venueId)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        venueService.deleteVenue(venueId)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      assertThat(exception.message).isEqualTo("장소를 찾을 수 없습니다.")
      then(venueRepository).shouldHaveNoMoreInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }
  }

  private fun venue(id: Long): Venue = Venue(
    id = id,
    name = "테스트 공연장",
    address = "서울특별시 송파구",
    description = "테스트 공연장입니다.",
    width = BigDecimal("100.00"),
    height = BigDecimal("100.00"),
    stagePositionX = BigDecimal("20.00"),
    stagePositionY = BigDecimal("5.00"),
    stageWidth = BigDecimal("40.00"),
    stageHeight = BigDecimal("10.00"),
  )

  private fun venueSeat(id: Long, venue: Venue, seatNumber: Int = 1): VenueSeat = VenueSeat(
    id = id,
    venue = venue,
    sectionName = "A구역",
    seatNumber = seatNumber,
    seatLabel = "A구역 ${seatNumber}번",
    price = 50_000,
    positionX = BigDecimal("10.00"),
    positionY = BigDecimal("30.00"),
  )

  private fun createRequest(): CreateVenueDetailRequest = CreateVenueDetailRequest(
    venue = CreateVenueRequest(
      name = "신규 공연장",
      address = "서울특별시 송파구",
      description = "신규 공연장입니다.",
      width = BigDecimal("100.00"),
      height = BigDecimal("100.00"),
      stagePositionX = BigDecimal("20.00"),
      stagePositionY = BigDecimal("10.00"),
      stageWidth = BigDecimal("40.00"),
      stageHeight = BigDecimal("20.00"),
    ),
    venueSeats = listOf(
      CreateVenueSeatRequest(
        sectionName = "A구역",
        seatNumber = 1,
        seatLabel = "A구역 1번",
        price = 50_000,
        positionX = BigDecimal("10.00"),
        positionY = BigDecimal("30.00"),
      ),
    ),
  )

  private fun updateSeatRequest(
    id: Long?,
    seatNumber: Int = 1,
    seatLabel: String = "A구역 1번",
    positionX: BigDecimal = BigDecimal("10.00"),
    positionY: BigDecimal = BigDecimal("30.00"),
  ): UpdateVenueSeatRequest = UpdateVenueSeatRequest(
    id = id.toJsonNullable(),
    sectionName = "A구역",
    seatNumber = seatNumber,
    seatLabel = seatLabel,
    price = 50_000,
    positionX = positionX,
    positionY = positionY,
  )

  private fun updateRequest(
    venue: UpdateVenueRequest? = null,
    venueSeats: List<UpdateVenueSeatRequest>? = null,
    deletedVenueSeatIds: List<Long>? = null,
  ): UpdateVenueDetailRequest = UpdateVenueDetailRequest(
    venue = venue.toJsonNullable(),
    venueSeats = venueSeats.toJsonNullable(),
    deletedVenueSeatIds = deletedVenueSeatIds.toJsonNullable(),
  )

  // null이면 값이 존재하지 않는 상태(undefined)로, 그 외에는 값이 존재하는 상태로 변환한다.
  private fun <T> T?.toJsonNullable(): JsonNullable<T> = if (this == null) JsonNullable.undefined() else JsonNullable.of(this)
}

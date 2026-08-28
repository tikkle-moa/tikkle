package com.example.server.concert

import com.example.server.concert.dto.ConcertDetailResponse
import com.example.server.concert.dto.ConcertListResponse
import com.example.server.concert.dto.ConcertResponse
import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.dto.UpdateConcertRequest
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.venue.entity.Venue
import com.example.server.venue.repository.VenueRepository
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
import java.time.LocalDateTime
import java.util.Optional
import kotlin.test.assertEquals

@ExtendWith(MockitoExtension::class)
class ConcertServiceTest {
  @Mock
  lateinit var concertRepository: ConcertRepository

  @Mock
  lateinit var performanceRepository: PerformanceRepository

  @Mock
  lateinit var venueRepository: VenueRepository

  @InjectMocks
  lateinit var concertService: ConcertService

  private fun concert(
    id: Long = 1L,
    title: String = "기존 제목",
    genre: ConcertGenre = ConcertGenre.BALLAD,
    venueName: String = "기존 장소",
    posterUrl: String? = "https://example.com/old.jpg",
    description: String? = "기존 설명",
  ): Concert = Concert(
    id = id,
    venue = venue(),
    title = title,
    genre = genre,
    venueName = venueName,
    posterUrl = posterUrl,
    description = description,
  )

  @Nested
  @DisplayName("create")
  inner class Create {
    @Test
    fun `콘서트를 생성하면 저장된 콘서트를 반환한다`() {
      val request = CreateConcertRequest(
        venueId = 1L,
        title = "아이유 콘서트",
        genre = ConcertGenre.BALLAD,
        posterUrl = "https://example.com/poster.jpg",
        description = "아이유의 단독 콘서트입니다.",
      )

      val saved = Concert(
        id = 1L,
        venue = venue(),
        title = request.title,
        genre = request.genre,
        venueName = "올림픽 체조경기장",
        posterUrl = request.posterUrl,
        description = request.description,
      )

      given(venueRepository.findById(1L)).willReturn(Optional.of(venue()))
      given(concertRepository.save(any(Concert::class.java)))
        .willReturn(saved)

      val result = concertService.create(request)

      assertEquals(saved.id, result.id)
      assertEquals(saved.title, result.title)
      assertEquals(saved.genre, result.genre)
      assertEquals(saved.venueName, result.venueName)
      assertEquals(saved.posterUrl, result.posterUrl)
      assertEquals(saved.description, result.description)

      then(concertRepository)
        .should()
        .save(any(Concert::class.java))
    }

    @Test
    fun `존재하지 않는 공연장으로 콘서트를 생성하면 NOT_FOUND 예외를 던진다`() {
      val request = CreateConcertRequest(
        venueId = 99L,
        title = "아이유 콘서트",
        genre = ConcertGenre.BALLAD,
        posterUrl = null,
        description = null,
      )
      given(venueRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        concertService.create(request)
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
      then(concertRepository).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("update")
  inner class Update {
    @Test
    fun `전달된 필드만 업데이트한다`() {
      val concert = concert(
        title = "기존 제목",
        genre = ConcertGenre.ROCK_METAL,
        venueName = "기존 장소",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest(
        title = JsonNullable.of("새 제목"),
        genre = JsonNullable.of(ConcertGenre.BALLAD),
      )

      val result = concertService.update(1L, request)

      assertEquals("새 제목", concert.title)
      assertEquals(ConcertGenre.BALLAD, concert.genre)
      assertEquals("기존 장소", concert.venueName)

      assertEquals("새 제목", result.title)
      assertEquals(ConcertGenre.BALLAD, result.genre)
      assertEquals("기존 장소", result.venueName)
    }

    @Test
    fun `미전달 필드는 기존 값을 유지한다`() {
      val concert = concert()

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val result = concertService.update(
        1L,
        UpdateConcertRequest(),
      )

      assertEquals("기존 제목", result.title)
      assertEquals(ConcertGenre.BALLAD, result.genre)
      assertEquals("기존 장소", result.venueName)
      assertEquals("https://example.com/old.jpg", result.posterUrl)
      assertEquals("기존 설명", result.description)
    }

    @Test
    fun `nullable 필드에 null을 전달하면 기존 값을 제거한다`() {
      val concert = concert()

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest(
        posterUrl = JsonNullable.of(null),
        description = JsonNullable.of(null),
      )

      val result = concertService.update(1L, request)

      assertEquals(null, concert.posterUrl)
      assertEquals(null, concert.description)

      assertEquals(null, result.posterUrl)
      assertEquals(null, result.description)
    }

    @Test
    fun `nullable 필드에 값을 전달하면 새로운 값으로 수정한다`() {
      val concert = concert()

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest(
        posterUrl = JsonNullable.of("https://example.com/new.jpg"),
        description = JsonNullable.of("새 설명"),
      )

      val result = concertService.update(1L, request)

      assertEquals("https://example.com/new.jpg", concert.posterUrl)
      assertEquals("새 설명", concert.description)

      assertEquals("https://example.com/new.jpg", result.posterUrl)
      assertEquals("새 설명", result.description)
    }

    @Test
    fun `존재하지 않는 콘서트 수정 시 NOT_FOUND 예외를 던진다`() {
      given(concertRepository.findById(99L))
        .willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        concertService.update(
          99L,
          UpdateConcertRequest(
            title = JsonNullable.of("새 제목"),
          ),
        )
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }
  }

  @Nested
  @DisplayName("delete")
  inner class Delete {
    @Test
    fun `콘서트를 삭제한다`() {
      val concert = concert()

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      concertService.delete(1L)

      val order = inOrder(performanceRepository, concertRepository)
      order.verify(performanceRepository).deleteAllByConcertId(1L)
      order.verify(concertRepository).delete(concert)
    }

    @Test
    fun `존재하지 않는 콘서트 삭제 시 NOT_FOUND 예외를 던진다`() {
      given(concertRepository.findById(99L))
        .willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        concertService.delete(99L)
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }
  }

  @Nested
  @DisplayName("getConcerts")
  inner class GetConcerts {
    @Test
    fun `최신 생성순 콘서트 목록을 반환한다`() {
      val latestConcert = concert(
        id = 2L,
        title = "최신 콘서트",
        genre = ConcertGenre.ROCK_METAL,
      )
      val previousConcert = concert(
        id = 1L,
        title = "이전 콘서트",
        genre = ConcertGenre.BALLAD,
      )
      given(concertRepository.findAllByOrderByCreatedAtDesc())
        .willReturn(listOf(latestConcert, previousConcert))

      val result = concertService.getConcerts()

      assertThat(result).containsExactly(
        ConcertListResponse.from(latestConcert),
        ConcertListResponse.from(previousConcert),
      )
      then(concertRepository).should().findAllByOrderByCreatedAtDesc()
    }

    @Test
    fun `콘서트가 없으면 빈 목록을 반환한다`() {
      given(concertRepository.findAllByOrderByCreatedAtDesc())
        .willReturn(emptyList())

      val result = concertService.getConcerts()

      assertThat(result).isEmpty()
      then(concertRepository).should().findAllByOrderByCreatedAtDesc()
    }
  }

  @Nested
  @DisplayName("getConcertDetail")
  inner class GetConcertDetail {
    @Test
    fun `콘서트 상세와 예정 회차 우선 시작 시각 오름차순 목록을 반환한다`() {
      val concert = concert()
      val firstPerformance = performance(
        concert = concert,
        id = 2L,
        startsAt = LocalDateTime.of(2026, 9, 1, 18, 0),
      )
      val secondPerformance = performance(
        concert = concert,
        id = 1L,
        startsAt = LocalDateTime.of(2026, 9, 2, 18, 0),
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))
      given(performanceRepository.findAllByConcertUpcomingFirstOrderByStartsAtAsc(concert))
        .willReturn(listOf(firstPerformance, secondPerformance))

      val result = concertService.getConcertDetail(1L)

      assertThat(result).isEqualTo(
        ConcertDetailResponse(
          concert = ConcertResponse.from(concert),
          performances = listOf(
            PerformanceResponse.from(firstPerformance),
            PerformanceResponse.from(secondPerformance),
          ),
        ),
      )
      then(concertRepository).should().findById(1L)
      then(performanceRepository).should().findAllByConcertUpcomingFirstOrderByStartsAtAsc(concert)
    }

    @Test
    fun `공연 회차가 없으면 빈 목록을 반환한다`() {
      val concert = concert()
      given(concertRepository.findById(1L)).willReturn(Optional.of(concert))
      given(performanceRepository.findAllByConcertUpcomingFirstOrderByStartsAtAsc(concert)).willReturn(emptyList())

      val result = concertService.getConcertDetail(1L)

      assertThat(result.performances).isEmpty()
    }

    @Test
    fun `존재하지 않는 콘서트 조회 시 NOT_FOUND 예외를 던진다`() {
      given(concertRepository.findById(99L))
        .willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        concertService.getConcertDetail(99L)
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
      then(performanceRepository).shouldHaveNoInteractions()
    }
  }

  private fun performance(concert: Concert, id: Long, startsAt: LocalDateTime): Performance = Performance(
    id = id,
    concert = concert,
    name = "1회차",
    startsAt = startsAt,
    bookingOpensAt = LocalDateTime.of(2026, 8, 1, 10, 0),
    createdAt = LocalDateTime.of(2026, 7, 1, 10, 0),
  )

  private fun venue(): Venue = Venue(
    id = 1L,
    name = "올림픽 체조경기장",
    address = "서울",
    width = BigDecimal("100.00"),
    height = BigDecimal("100.00"),
    stagePositionX = BigDecimal("20.00"),
    stagePositionY = BigDecimal("5.00"),
    stageWidth = BigDecimal("40.00"),
    stageHeight = BigDecimal("10.00"),
  )
}

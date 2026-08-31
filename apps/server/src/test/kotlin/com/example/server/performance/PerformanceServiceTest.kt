package com.example.server.performance

import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.UpdatePerformanceRequest
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.performance.types.PerformanceStatus
import com.example.server.venue.entity.Venue
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.openapitools.jackson.nullable.JsonNullable
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Optional
import kotlin.test.assertEquals

@ExtendWith(MockitoExtension::class)
class PerformanceServiceTest {
  @Mock
  lateinit var concertRepository: ConcertRepository

  @Mock
  lateinit var performanceRepository: PerformanceRepository

  @InjectMocks
  lateinit var performanceService: PerformanceService

  private fun concert(id: Long = 1L): Concert = Concert(
    id = id,
    venue = venue(),
    title = "아이유 콘서트",
    genre = ConcertGenre.BALLAD,
  )

  private fun performance(
    id: Long = 1L,
    concert: Concert = concert(),
    startsAt: LocalDateTime = LocalDateTime.of(2027, 1, 20, 19, 0),
    bookingOpensAt: LocalDateTime? = LocalDateTime.of(2027, 1, 10, 10, 0),
  ): Performance = Performance(
    id = id,
    concert = concert,
    name = "1회차",
    startsAt = startsAt,
    bookingOpensAt = bookingOpensAt,
  )

  private fun venue() = Venue(
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

  @Nested
  @DisplayName("getPerformance")
  inner class GetPerformance {
    @Test
    fun `공연 회차 상세를 반환한다`() {
      val performance = performance()
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      val result = performanceService.getPerformance(1L)

      assertThat(result.id).isEqualTo(performance.id)
      assertThat(result.concertId).isEqualTo(performance.concert.id)
    }

    @Test
    fun `조회할 공연 회차가 없으면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(99L)).willReturn(Optional.empty())
      val exception = assertThrows<CustomException> { performanceService.getPerformance(99L) }
      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }
  }

  @Nested
  @DisplayName("getPerformances")
  inner class GetPerformances {
    @Test
    fun `저장소에서 조회한 회차 순서를 유지해 응답으로 변환한다`() {
      val nearestUpcomingPerformance = performance(
        id = 1L,
        startsAt = LocalDateTime.of(2027, 7, 24, 19, 0),
      )
      val laterUpcomingPerformance = performance(
        id = 2L,
        startsAt = LocalDateTime.of(2027, 7, 25, 19, 0),
      )
      val oldPastPerformance = performance(
        id = 3L,
        startsAt = LocalDateTime.of(2026, 7, 24, 19, 0),
      )
      val recentPastPerformance = performance(
        id = 4L,
        startsAt = LocalDateTime.of(2026, 7, 25, 19, 0),
      )
      given(performanceRepository.findAllUpcomingFirstOrderByStartsAtAsc())
        .willReturn(
          listOf(
            nearestUpcomingPerformance,
            laterUpcomingPerformance,
            oldPastPerformance,
            recentPastPerformance,
          ),
        )

      val result = performanceService.getPerformances()

      assertThat(result.map { it.id }).containsExactly(1L, 2L, 3L, 4L)
    }

    @Test
    fun `공연 회차 목록에 예매 상태를 포함한다`() {
      val now = LocalDateTime.now()
      val upcomingPerformance = performance(
        id = 1L,
        startsAt = now.plusDays(2),
        bookingOpensAt = now.plusDays(1),
      )
      val availablePerformance = performance(
        id = 2L,
        startsAt = now.plusDays(1),
        bookingOpensAt = now.minusDays(1),
      )
      val endedPerformance = performance(
        id = 3L,
        startsAt = now.minusDays(1),
        bookingOpensAt = now.minusDays(2),
      )
      given(performanceRepository.findAllUpcomingFirstOrderByStartsAtAsc())
        .willReturn(listOf(upcomingPerformance, availablePerformance, endedPerformance))

      val result = performanceService.getPerformances()

      assertThat(result.map { it.status }).containsExactly(
        PerformanceStatus.UPCOMING,
        PerformanceStatus.AVAILABLE,
        PerformanceStatus.ENDED,
      )
    }

    @Test
    fun `공연 회차가 없으면 빈 목록을 반환한다`() {
      given(performanceRepository.findAllUpcomingFirstOrderByStartsAtAsc()).willReturn(emptyList())

      val result = performanceService.getPerformances()

      assertThat(result).isEmpty()
    }
  }

  @Nested
  @DisplayName("getSeatsStatus")
  inner class GetSeatsStatus {
    @Test
    fun `서버 시각과 좌석 상태 목록을 반환한다`() {
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))
      val before = LocalDateTime.now()
      val result = performanceService.getSeatsStatus(1L)
      val after = LocalDateTime.now()
      assertThat(result.serverTime).isBetween(before, after)
      assertThat(result.bookedSeats).isEmpty()
      assertThat(result.heldSeats).isEmpty()
    }

    @Test
    fun `없는 공연 회차면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(99L)).willReturn(Optional.empty())
      val exception = assertThrows<CustomException> { performanceService.getSeatsStatus(99L) }
      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }
  }

  @Nested
  @DisplayName("create")
  inner class Create {
    @Test
    fun `유효한 회차를 생성하면 저장된 회차를 반환한다`() {
      val request = CreatePerformanceRequest(
        concertId = 1L,
        name = "1회차",
        startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
        bookingOpensAt = LocalDateTime.of(2027, 1, 10, 10, 0),
      )
      val concert = concert()
      val savedPerformance = performance(concert = concert)

      given(concertRepository.findById(request.concertId)).willReturn(Optional.of(concert))
      given(performanceRepository.save(org.mockito.ArgumentMatchers.any(Performance::class.java)))
        .willReturn(savedPerformance)

      val result = performanceService.create(request)

      assertThat(result.id).isEqualTo(savedPerformance.id)

      val captor = ArgumentCaptor.forClass(Performance::class.java)
      then(performanceRepository).should().save(captor.capture())
      assertThat(captor.value.concert).isSameAs(concert)
      assertThat(captor.value.startsAt).isEqualTo(request.startsAt)
      assertThat(captor.value.bookingOpensAt).isEqualTo(request.bookingOpensAt)
    }

    @Test
    fun `예매 시작 시각 없이 회차를 생성할 수 있다`() {
      val request = CreatePerformanceRequest(
        concertId = 1L,
        name = "1회차",
        startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
      )
      val concert = concert()
      val savedPerformance = performance(
        concert = concert,
        bookingOpensAt = null,
      )

      given(concertRepository.findById(1L)).willReturn(Optional.of(concert))
      given(performanceRepository.save(org.mockito.ArgumentMatchers.any(Performance::class.java)))
        .willReturn(savedPerformance)

      val result = performanceService.create(request)

      assertThat(result.bookingOpensAt).isNull()
    }

    @Test
    fun `예매 시작 시각이 공연 시작 시각보다 늦으면 생성에 실패한다`() {
      val request = CreatePerformanceRequest(
        concertId = 1L,
        name = "1회차",
        startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
        bookingOpensAt = LocalDateTime.of(2027, 1, 21, 10, 0),
      )

      val exception = assertThrows<CustomException> {
        performanceService.create(request)
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
      then(concertRepository).shouldHaveNoInteractions()
      then(performanceRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `존재하지 않는 콘서트로 회차를 생성하면 NOT_FOUND를 던진다`() {
      val request = CreatePerformanceRequest(
        concertId = 99L,
        name = "1회차",
        startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
        bookingOpensAt = LocalDateTime.of(2027, 1, 10, 10, 0),
      )
      given(concertRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        performanceService.create(request)
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }
  }

  @Nested
  @DisplayName("update")
  inner class Update {
    @Test
    fun `전달된 공연 시작 시각만 수정한다`() {
      val performance = performance()
      val updatedStartsAt = LocalDateTime.of(2027, 1, 21, 19, 0)
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      val result = performanceService.update(
        1L,
        UpdatePerformanceRequest(startsAt = JsonNullable.of(updatedStartsAt)),
      )

      assertThat(performance.startsAt).isEqualTo(updatedStartsAt)
      assertThat(result.startsAt).isEqualTo(updatedStartsAt)
      assertThat(result.bookingOpensAt).isEqualTo(LocalDateTime.of(2027, 1, 10, 10, 0))
    }

    @Test
    fun `수정 후 예매 시작 시각이 공연 시작 시각보다 늦으면 BAD_REQUEST를 던진다`() {
      val performance = performance()
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      val exception = assertThrows<CustomException> {
        performanceService.update(
          1L,
          UpdatePerformanceRequest(
            bookingOpensAt = JsonNullable.of(LocalDateTime.of(2027, 1, 21, 10, 0)),
          ),
        )
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
    }

    @Test
    fun `수정할 회차가 없으면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        performanceService.update(
          99L,
          UpdatePerformanceRequest(startsAt = JsonNullable.of(LocalDateTime.of(2027, 1, 21, 19, 0))),
        )
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }

    @Test
    fun `예매 시작 시각이 없는 기존 회차도 다른 필드를 수정할 수 있다`() {
      val performance = performance(bookingOpensAt = null)
      val updatedStartsAt = LocalDateTime.of(2027, 1, 21, 19, 0)
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      performanceService.update(
        1L,
        UpdatePerformanceRequest(startsAt = JsonNullable.of(updatedStartsAt)),
      )

      assertThat(performance.startsAt).isEqualTo(updatedStartsAt)
      assertThat(performance.bookingOpensAt).isNull()
    }

    @Test
    fun `예매 시작 시각을 null로 수정하면 기존 값을 제거한다`() {
      val performance = performance()
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      val result = performanceService.update(
        1L,
        UpdatePerformanceRequest(
          bookingOpensAt = JsonNullable.of<LocalDateTime?>(null),
        ),
      )

      assertThat(performance.bookingOpensAt).isNull()
      assertThat(result.bookingOpensAt).isNull()
    }
  }

  @Nested
  @DisplayName("delete")
  inner class Delete {
    @Test
    fun `회차를 삭제한다`() {
      val performance = performance()
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      performanceService.delete(1L)

      then(performanceRepository).should().delete(performance)
    }

    @Test
    fun `없는 회차를 삭제하면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        performanceService.delete(99L)
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }
  }
}

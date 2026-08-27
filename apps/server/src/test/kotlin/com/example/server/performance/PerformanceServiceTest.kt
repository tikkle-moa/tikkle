package com.example.server.performance

import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.ApplySeatChangesRequest
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.SeatChangeRequest
import com.example.server.performance.dto.UpdatePerformanceRequest
import com.example.server.performance.entity.Performance
import com.example.server.performance.entity.Seat
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.performance.repository.SeatRepository
import com.example.server.performance.types.PerformanceStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.anyList
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

  @Mock
  lateinit var seatRepository: SeatRepository

  @InjectMocks
  lateinit var performanceService: PerformanceService

  private fun concert(id: Long = 1L): Concert = Concert(
    id = id,
    title = "아이유 콘서트",
    genre = ConcertGenre.BALLAD,
    placeName = "올림픽 체조경기장",
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

  private fun seatRequest(id: Long? = null, seatNumber: Int = 1) = SeatChangeRequest(
    id = id,
    sectionName = "A구역",
    seatNumber = seatNumber,
    seatLabel = "A-$seatNumber",
    price = 100_000,
    positionX = BigDecimal("10.00"),
    positionY = BigDecimal("20.00"),
  )

  @Nested
  @DisplayName("getPerformance")
  inner class GetPerformance {
    @Test
    fun `공연 회차 상세를 반환한다`() {
      val performance = performance()
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))

      val result = performanceService.getPerformance(1L)

      assertThat(result.performance.id).isEqualTo(performance.id)
      assertThat(result.performance.concertId).isEqualTo(performance.concert.id)
      assertThat(result.seats).isEmpty()
    }

    @Test
    fun `조회할 공연 회차가 없으면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        performanceService.getPerformance(99L)
      }

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

  @Nested
  @DisplayName("applySeatChanges")
  inner class ApplySeatChanges {
    @Test
    fun `좌석을 일괄 생성하고 수정한다`() {
      val performance = performance()
      val existingSeat = Seat(
        id = 10L,
        performance = performance,
        sectionName = "B구역",
        seatNumber = 5,
        seatLabel = "B-5",
        price = 50_000,
        positionX = BigDecimal.ZERO,
        positionY = BigDecimal.ZERO,
      )
      val createdSeat = Seat(
        id = 11L,
        performance = performance,
        sectionName = "A구역",
        seatNumber = 1,
        seatLabel = "A-1",
        price = 100_000,
        positionX = BigDecimal("10.00"),
        positionY = BigDecimal("20.00"),
      )
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))
      given(seatRepository.findAllByPerformanceId(1L))
        .willReturn(listOf(existingSeat), listOf(createdSeat, existingSeat))
      given(seatRepository.saveAll<Seat>(anyList())).willAnswer { it.getArgument(0) }

      val result = performanceService.applySeatChanges(
        1L,
        ApplySeatChangesRequest(seats = listOf(seatRequest(), seatRequest(id = 10L, seatNumber = 2))),
      )

      assertThat(result).hasSize(2)
      assertThat(existingSeat.sectionName).isEqualTo("A구역")
      assertThat(existingSeat.seatNumber).isEqualTo(2)
      then(seatRepository).should().saveAll<Seat>(anyList())
    }

    @Test
    fun `삭제 목록에 포함된 좌석을 삭제한다`() {
      val performance = performance()
      val seat = Seat(
        id = 10L,
        performance = performance,
        sectionName = "A구역",
        seatNumber = 1,
        seatLabel = "A-1",
        price = 100_000,
        positionX = BigDecimal.ZERO,
        positionY = BigDecimal.ZERO,
      )
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))
      given(seatRepository.findAllByPerformanceId(1L)).willReturn(listOf(seat), emptyList())

      val result = performanceService.applySeatChanges(
        1L,
        ApplySeatChangesRequest(deletedSeatIds = listOf(10L)),
      )

      assertThat(result).isEmpty()
      then(seatRepository).should().deleteAll(listOf(seat))
    }

    @Test
    fun `다른 회차의 좌석을 변경하면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))
      given(seatRepository.findAllByPerformanceId(1L)).willReturn(emptyList())

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(
          1L,
          ApplySeatChangesRequest(seats = listOf(seatRequest(id = 10L))),
        )
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
    }

    @Test
    fun `존재하지 않는 회차의 좌석을 변경하면 NOT_FOUND를 던진다`() {
      given(performanceRepository.findById(99L)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(99L, ApplySeatChangesRequest())
      }

      assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
      then(seatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `수정할 좌석 ID가 중복되면 BAD_REQUEST를 던진다`() {
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(
          1L,
          ApplySeatChangesRequest(
            seats = listOf(seatRequest(id = 10L), seatRequest(id = 10L, seatNumber = 2)),
          ),
        )
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
      then(seatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `삭제할 좌석 ID가 중복되면 BAD_REQUEST를 던진다`() {
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(
          1L,
          ApplySeatChangesRequest(deletedSeatIds = listOf(10L, 10L)),
        )
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
      then(seatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `같은 좌석을 수정하고 삭제하면 BAD_REQUEST를 던진다`() {
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(
          1L,
          ApplySeatChangesRequest(
            seats = listOf(seatRequest(id = 10L)),
            deletedSeatIds = listOf(10L),
          ),
        )
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
      then(seatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `같은 구역의 좌석 번호가 중복되면 BAD_REQUEST를 던진다`() {
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(
          1L,
          ApplySeatChangesRequest(seats = listOf(seatRequest(), seatRequest())),
        )
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
      then(seatRepository).should().findAllByPerformanceId(1L)
      then(seatRepository).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `기존 좌석과 같은 구역의 좌석 번호를 생성하면 BAD_REQUEST를 던진다`() {
      val performance = performance()
      val existingSeat = Seat(
        id = 10L,
        performance = performance,
        sectionName = "A구역",
        seatNumber = 1,
        seatLabel = "A-1",
        price = 100_000,
        positionX = BigDecimal.ZERO,
        positionY = BigDecimal.ZERO,
      )
      given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))
      given(seatRepository.findAllByPerformanceId(1L)).willReturn(listOf(existingSeat))

      val exception = assertThrows<CustomException> {
        performanceService.applySeatChanges(
          1L,
          ApplySeatChangesRequest(seats = listOf(seatRequest())),
        )
      }

      assertEquals(ErrorCode.BAD_REQUEST, exception.errorCode)
      then(seatRepository).should().findAllByPerformanceId(1L)
      then(seatRepository).shouldHaveNoMoreInteractions()
    }
  }
}

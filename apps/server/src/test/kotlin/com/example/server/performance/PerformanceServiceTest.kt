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
import org.assertj.core.api.Assertions.assertThat
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
    startsAt = startsAt,
    bookingOpensAt = bookingOpensAt,
  )

  @Test
  fun `유효한 회차를 생성하면 저장된 회차를 반환한다`() {
    val request = CreatePerformanceRequest(
      concertId = 1L,
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
  fun `예매 시작 시각이 공연 시작 시각보다 늦으면 생성에 실패한다`() {
    val request = CreatePerformanceRequest(
      concertId = 1L,
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
      startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
      bookingOpensAt = LocalDateTime.of(2027, 1, 10, 10, 0),
    )
    given(concertRepository.findById(99L)).willReturn(Optional.empty())

    val exception = assertThrows<CustomException> {
      performanceService.create(request)
    }

    assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
  }

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
  fun `콘서트 ID를 전달하면 회차의 콘서트를 변경한다`() {
    val performance = performance()
    val newConcert = concert(id = 2L)
    given(performanceRepository.findById(1L)).willReturn(Optional.of(performance))
    given(concertRepository.findById(2L)).willReturn(Optional.of(newConcert))

    val result = performanceService.update(
      1L,
      UpdatePerformanceRequest(concertId = JsonNullable.of(2L)),
    )

    assertThat(performance.concert).isSameAs(newConcert)
    assertThat(result.concertId).isEqualTo(2L)
  }

  @Test
  fun `변경할 콘서트가 없으면 NOT_FOUND를 던진다`() {
    given(performanceRepository.findById(1L)).willReturn(Optional.of(performance()))
    given(concertRepository.findById(99L)).willReturn(Optional.empty())

    val exception = assertThrows<CustomException> {
      performanceService.update(
        1L,
        UpdatePerformanceRequest(concertId = JsonNullable.of(99L)),
      )
    }

    assertEquals(ErrorCode.NOT_FOUND, exception.errorCode)
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

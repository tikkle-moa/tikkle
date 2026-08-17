package com.example.server.concert

import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.dto.UpdateConcertRequest
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
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
import org.mockito.junit.jupiter.MockitoExtension
import java.util.Optional
import kotlin.test.assertEquals

@ExtendWith(MockitoExtension::class)
class ConcertServiceTest {

  private val testConcert = Concert(
    id = 1L,
    title = "아이유 콘서트",
    genre = ConcertGenre.BALLAD,
    placeName = "올림픽 체조경기장",
    posterUrl = "https://example.com/poster.jpg",
    description = "아이유의 단독 콘서트입니다.",
  )

  @Mock
  lateinit var concertRepository: ConcertRepository

  @InjectMocks
  lateinit var concertService: ConcertService

  @Nested
  @DisplayName("create")
  inner class Create {

    @Test
    fun `콘서트를 생성하면 저장된 콘서트를 반환한다`() {
      val request = CreateConcertRequest(
        title = "아이유 콘서트",
        genre = ConcertGenre.BALLAD,
        placeName = "올림픽 체조경기장",
        posterUrl = "https://example.com/poster.jpg",
        description = "아이유의 단독 콘서트입니다.",
      )

      val saved = Concert(
        id = 1L,
        title = request.title,
        genre = request.genre,
        placeName = request.placeName,
        posterUrl = request.posterUrl,
        description = request.description,
      )

      given(concertRepository.save(any(Concert::class.java)))
        .willReturn(saved)

      val result = concertService.create(request)

      assertEquals(saved.id, result.id)
      assertEquals(saved.title, result.title)
      assertEquals(saved.genre, result.genre)
      assertEquals(saved.placeName, result.placeName)
      assertEquals(saved.posterUrl, result.posterUrl)
      assertEquals(saved.description, result.description)
    }
  }

  @Nested
  @DisplayName("update")
  inner class Update {

    @Test
    fun `전달된 필드만 업데이트한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.ROCK_METAL,
        placeName = "기존 장소",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest(
        title = "새 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "새 장소",
      )

      val result = concertService.update(1L, request)

      assertEquals("새 제목", result.title)
      assertEquals(ConcertGenre.BALLAD, result.genre)
      assertEquals("새 장소", result.placeName)
    }

    @Test
    fun `description을 전달하지 않으면 기존 값을 유지한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "기존 장소",
        description = "기존 설명",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest()

      val result = concertService.update(1L, request)

      assertEquals("기존 설명", result.description)
    }

    @Test
    fun `description에 null을 전달하면 기존 값을 제거한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "기존 장소",
        description = "기존 설명",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest().apply {
        updateDescription(null)
      }

      val result = concertService.update(1L, request)

      assertEquals(null, result.description)
    }

    @Test
    fun `description을 전달하면 새로운 값으로 수정한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "기존 장소",
        description = "기존 설명",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest().apply {
        updateDescription("새 설명")
      }

      val result = concertService.update(1L, request)

      assertEquals("새 설명", result.description)
    }

    @Test
    fun `posterUrl을 전달하지 않으면 기존 값을 유지한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "기존 장소",
        posterUrl = "https://example.com/old.jpg",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest()

      val result = concertService.update(1L, request)

      assertEquals("https://example.com/old.jpg", result.posterUrl)
    }

    @Test
    fun `posterUrl에 null을 전달하면 기존 값을 제거한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "기존 장소",
        posterUrl = "https://example.com/old.jpg",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest().apply {
        updatePosterUrl(null)
      }

      val result = concertService.update(1L, request)

      assertEquals(null, result.posterUrl)
    }

    @Test
    fun `posterUrl을 전달하면 새로운 값으로 수정한다`() {
      val concert = Concert(
        id = 1L,
        title = "기존 제목",
        genre = ConcertGenre.BALLAD,
        placeName = "기존 장소",
        posterUrl = "https://example.com/old.jpg",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest().apply {
        updatePosterUrl("https://example.com/new.jpg")
      }

      val result = concertService.update(1L, request)

      assertEquals("https://example.com/new.jpg", result.posterUrl)
    }

    @Test
    fun `존재하지 않는 콘서트 수정 시 NOT_FOUND 예외를 던진다`() {
      given(concertRepository.findById(99L))
        .willReturn(Optional.empty())

      val ex = assertThrows<CustomException> {
        concertService.update(
          99L,
          UpdateConcertRequest(title = "새 제목"),
        )
      }

      assertEquals(ErrorCode.NOT_FOUND, ex.errorCode)
    }
  }

  @Nested
  @DisplayName("delete")
  inner class Delete {

    @Test
    fun `콘서트를 삭제한다`() {
      given(concertRepository.findById(1L))
        .willReturn(Optional.of(testConcert))

      concertService.delete(1L)

      then(concertRepository)
        .should()
        .delete(testConcert)
    }

    @Test
    fun `존재하지 않는 콘서트 삭제 시 NOT_FOUND 예외를 던진다`() {
      given(concertRepository.findById(99L))
        .willReturn(Optional.empty())

      val ex = assertThrows<CustomException> {
        concertService.delete(99L)
      }

      assertEquals(ErrorCode.NOT_FOUND, ex.errorCode)
    }
  }
}

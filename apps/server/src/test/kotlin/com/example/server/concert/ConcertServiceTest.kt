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
import org.openapitools.jackson.nullable.JsonNullable
import java.util.Optional
import kotlin.test.assertEquals

@ExtendWith(MockitoExtension::class)
class ConcertServiceTest {
  @Mock
  lateinit var concertRepository: ConcertRepository

  @InjectMocks
  lateinit var concertService: ConcertService

  private fun concert(
    id: Long = 1L,
    title: String = "기존 제목",
    genre: ConcertGenre = ConcertGenre.BALLAD,
    placeName: String = "기존 장소",
    posterUrl: String? = "https://example.com/old.jpg",
    description: String? = "기존 설명",
  ): Concert = Concert(
    id = id,
    title = title,
    genre = genre,
    placeName = placeName,
    posterUrl = posterUrl,
    description = description,
  )

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

      then(concertRepository)
        .should()
        .save(any(Concert::class.java))
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
        placeName = "기존 장소",
      )

      given(concertRepository.findById(1L))
        .willReturn(Optional.of(concert))

      val request = UpdateConcertRequest(
        title = JsonNullable.of("새 제목"),
        genre = JsonNullable.of(ConcertGenre.BALLAD),
        placeName = JsonNullable.of("새 장소"),
      )

      val result = concertService.update(1L, request)

      assertEquals("새 제목", concert.title)
      assertEquals(ConcertGenre.BALLAD, concert.genre)
      assertEquals("새 장소", concert.placeName)

      assertEquals("새 제목", result.title)
      assertEquals(ConcertGenre.BALLAD, result.genre)
      assertEquals("새 장소", result.placeName)
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
      assertEquals("기존 장소", result.placeName)
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

      then(concertRepository)
        .should()
        .delete(concert)
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
}

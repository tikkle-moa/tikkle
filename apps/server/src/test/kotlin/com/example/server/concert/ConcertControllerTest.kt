package com.example.server.concert

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.concert.dto.ConcertListResponse
import com.example.server.concert.dto.ConcertResponse
import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.dto.UpdateConcertRequest
import com.example.server.concert.types.ConcertGenre
import com.example.server.config.SecurityConfig
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.response.ApiResponse
import com.example.server.global.security.RestAccessDeniedHandler
import com.example.server.global.security.RestAuthenticationEntryPoint
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.argThat
import org.mockito.ArgumentMatchers.eq
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mockito.verify
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime

@WebMvcTest(ConcertController::class)
@Import(
  SecurityConfig::class,
  RestAuthenticationEntryPoint::class,
  RestAccessDeniedHandler::class,
)
@ActiveProfiles("test")
class ConcertControllerTest {
  @Autowired
  lateinit var mockMvc: MockMvc

  @Autowired
  lateinit var objectMapper: ObjectMapper

  @MockitoBean
  lateinit var concertService: ConcertService

  @MockitoBean
  lateinit var appProperties: AppProperties

  @MockitoBean
  lateinit var jwtProperties: JwtProperties

  @MockitoBean
  lateinit var jwtTokenProvider: JwtTokenProvider

  private val adminAuth = UsernamePasswordAuthenticationToken(
    LoginUserResult(
      userId = 1L,
      role = UserRole.ADMIN,
    ),
    null,
    listOf(SimpleGrantedAuthority("ROLE_ADMIN")),
  )

  private val userAuth = UsernamePasswordAuthenticationToken(
    LoginUserResult(
      userId = 2L,
      role = UserRole.USER,
    ),
    null,
    listOf(SimpleGrantedAuthority("ROLE_USER")),
  )

  @BeforeEach
  fun setUp() {
    given(appProperties.frontendUrl).willReturn("http://localhost:5173")
    given(appProperties.production).willReturn(false)
    given(jwtProperties.accessTokenExpirationMinutes).willReturn(30L)
    given(jwtProperties.refreshTokenExpirationDays).willReturn(7L)
  }

  private fun concertResponse(id: Long = 1L, title: String = "아이유 콘서트"): ConcertResponse = ConcertResponse(
    id = id,
    title = title,
    genre = ConcertGenre.BALLAD,
    placeName = "올림픽 체조경기장",
    posterUrl = null,
    description = null,
    createdAt = LocalDateTime.of(2026, 8, 18, 12, 0),
  )

  @Nested
  @DisplayName("POST /api/concerts")
  inner class CreateConcert {
    @Test
    fun `관리자가 유효한 요청으로 콘서트를 생성한다`() {
      val request = CreateConcertRequest(
        title = "아이유 콘서트",
        genre = ConcertGenre.BALLAD,
        placeName = "올림픽 체조경기장",
      )

      given(concertService.create(request))
        .willReturn(concertResponse())

      mockMvc.post("/api/concerts") {
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(request)
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isCreated() }
        content { contentTypeCompatibleWith(MediaType.APPLICATION_JSON) }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data.id") { value(1) }
        jsonPath("$.data.title") { value("아이유 콘서트") }
        jsonPath("$.data.genre") { value("BALLAD") }
        jsonPath("$.data.placeName") { value("올림픽 체조경기장") }
        jsonPath("$.data.posterUrl") { doesNotExist() }
        jsonPath("$.data.description") { doesNotExist() }
        jsonPath("$.data.createdAt") { exists() }
      }
    }

    @Test
    fun `필수 필드가 없으면 400을 반환한다`() {
      mockMvc.post("/api/concerts") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"genre":"BALLAD"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `title이 공백이면 400을 반환한다`() {
      mockMvc.post("/api/concerts") {
        contentType = MediaType.APPLICATION_JSON
        content = """
          {
            "title": "   ",
            "genre": "BALLAD",
            "placeName": "올림픽 체조경기장"
          }
        """.trimIndent()
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `지원하지 않는 genre이면 400을 반환한다`() {
      mockMvc.post("/api/concerts") {
        contentType = MediaType.APPLICATION_JSON
        content = """
          {
            "title": "아이유 콘서트",
            "genre": "INVALID",
            "placeName": "올림픽 체조경기장"
          }
        """.trimIndent()
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `일반 사용자가 콘서트를 생성하면 403을 반환한다`() {
      val request = CreateConcertRequest(
        title = "아이유 콘서트",
        genre = ConcertGenre.BALLAD,
        placeName = "올림픽 체조경기장",
      )

      mockMvc.post("/api/concerts") {
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(request)
        with(authentication(userAuth))
        with(csrf())
      }.andExpect {
        status { isForbidden() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `인증 없이 접근하면 401을 반환한다`() {
      val request = CreateConcertRequest(
        title = "아이유 콘서트",
        genre = ConcertGenre.BALLAD,
        placeName = "올림픽 체조경기장",
      )

      mockMvc.post("/api/concerts") {
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(request)
        with(csrf())
      }.andExpect {
        status { isUnauthorized() }
      }

      then(concertService).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("PATCH /api/concerts/{id}")
  inner class UpdateConcert {
    private fun <T> org.openapitools.jackson.nullable.JsonNullable<T>.hasValue(value: T): Boolean = isPresent && get() == value

    private fun updateRequestThat(predicate: (UpdateConcertRequest) -> Boolean): UpdateConcertRequest = argThat<UpdateConcertRequest> {
      predicate(it)
    } ?: UpdateConcertRequest()

    @Test
    fun `관리자가 콘서트를 수정한다`() {
      given(
        concertService.update(
          eq(1L),
          updateRequestThat { it.title.hasValue("새 제목") },
        ),
      ).willReturn(
        concertResponse(title = "새 제목"),
      )

      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"title":"새 제목"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isOk() }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data.title") { value("새 제목") }
      }
    }

    @Test
    fun `최대 길이를 초과하면 400을 반환한다`() {
      val title = "a".repeat(101)

      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"title":"$title"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
        jsonPath("$.error.message") { exists() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `null을 허용하지 않는 수정 필드에 null을 전달하면 400을 반환한다`() {
      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"title":null,"genre":null,"placeName":null}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `nullable 필드의 null과 미전달 상태를 구분한다`() {
      given(
        concertService.update(
          eq(1L),
          updateRequestThat { true },
        ),
      ).willReturn(concertResponse())

      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"posterUrl":null}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isOk() }
        jsonPath("$.success") { value(true) }
      }

      val captor = ArgumentCaptor.forClass(UpdateConcertRequest::class.java)

      verify(concertService).update(
        eq(1L),
        captor.capture() ?: UpdateConcertRequest(),
      )

      val request = captor.value

      assertTrue(request.posterUrl.isPresent)
      assertNull(request.posterUrl.get())
      assertFalse(request.description.isPresent)
    }

    @Test
    fun `nullable 필드에 빈 문자열을 전달하면 400을 반환한다`() {
      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"description":"   "}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `지원하지 않는 genre이면 400을 반환한다`() {
      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"genre":"INVALID"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `존재하지 않는 콘서트 수정 시 404를 반환한다`() {
      given(
        concertService.update(
          eq(99L),
          updateRequestThat { it.title.hasValue("새 제목") },
        ),
      ).willThrow(
        CustomException(ErrorCode.NOT_FOUND),
      )

      mockMvc.patch("/api/concerts/99") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"title":"새 제목"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isNotFound() }
        jsonPath("$.success") { value(false) }
      }
    }

    @Test
    fun `일반 사용자가 콘서트를 수정하면 403을 반환한다`() {
      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"title":"새 제목"}"""
        with(authentication(userAuth))
        with(csrf())
      }.andExpect {
        status { isForbidden() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `인증 없이 콘서트를 수정하면 401을 반환한다`() {
      mockMvc.patch("/api/concerts/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"title":"새 제목"}"""
        with(csrf())
      }.andExpect {
        status { isUnauthorized() }
      }

      then(concertService).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("DELETE /api/concerts/{id}")
  inner class DeleteConcert {
    @Test
    fun `관리자가 콘서트를 삭제한다`() {
      mockMvc.delete("/api/concerts/1") {
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isOk() }
        jsonPath("$.success") { value(true) }
      }

      then(concertService)
        .should()
        .delete(1L)
    }

    @Test
    fun `존재하지 않는 콘서트 삭제 시 404를 반환한다`() {
      given(concertService.delete(99L))
        .willThrow(CustomException(ErrorCode.NOT_FOUND))

      mockMvc.delete("/api/concerts/99") {
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isNotFound() }
        jsonPath("$.success") { value(false) }
      }
    }

    @Test
    fun `일반 사용자가 콘서트를 삭제하면 403을 반환한다`() {
      mockMvc.delete("/api/concerts/1") {
        with(authentication(userAuth))
        with(csrf())
      }.andExpect {
        status { isForbidden() }
      }

      then(concertService).shouldHaveNoInteractions()
    }

    @Test
    fun `인증 없이 콘서트를 삭제하면 401을 반환한다`() {
      mockMvc.delete("/api/concerts/1") {
        with(csrf())
      }.andExpect {
        status { isUnauthorized() }
      }

      then(concertService).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("GET /api/concerts")
  inner class GetConcerts {
    @Test
    fun `콘서트 목록을 반환한다`() {
      val concerts = listOf(
        ConcertListResponse(
          id = 2L,
          title = "최신 콘서트",
          genre = ConcertGenre.ROCK_METAL,
          placeName = "수원",
          posterUrl = "https://example.com/poster.png",
          createdAt = LocalDateTime.of(2026, 8, 17, 15, 0),
        ),
      )
      given(concertService.getConcerts()).willReturn(concerts)

      mockMvc.get("/api/concerts")
        .andExpect {
          status { isOk() }
          content {
            json(objectMapper.writeValueAsString(ApiResponse.ok(concerts)))
          }
        }

      then(concertService).should().getConcerts()
    }
  }
}

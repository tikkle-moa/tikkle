package com.example.server.performance

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.config.SecurityConfig
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.security.RestAccessDeniedHandler
import com.example.server.global.security.RestAuthenticationEntryPoint
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.dto.UpdatePerformanceRequest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.argThat
import org.mockito.ArgumentMatchers.eq
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.openapitools.jackson.nullable.JsonNullable
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
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime

@WebMvcTest(PerformanceController::class)
@Import(
  SecurityConfig::class,
  RestAuthenticationEntryPoint::class,
  RestAccessDeniedHandler::class,
)
@ActiveProfiles("test")
class PerformanceControllerTest {
  @Autowired
  lateinit var mockMvc: MockMvc

  @Autowired
  lateinit var objectMapper: ObjectMapper

  @MockitoBean
  lateinit var performanceService: PerformanceService

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

  private fun performanceResponse(
    id: Long = 1L,
    concertId: Long = 1L,
    startsAt: LocalDateTime = LocalDateTime.of(2027, 1, 20, 19, 0),
    bookingOpensAt: LocalDateTime? = LocalDateTime.of(2027, 1, 10, 10, 0),
  ): PerformanceResponse = PerformanceResponse(
    id = id,
    concertId = concertId,
    startsAt = startsAt,
    bookingOpensAt = bookingOpensAt,
    createdAt = LocalDateTime.of(2026, 8, 24, 12, 0),
  )

  @Nested
  @DisplayName("POST /api/performances")
  inner class CreatePerformance {
    @Test
    fun `관리자가 유효한 요청으로 회차를 생성하면 201을 반환한다`() {
      val request = CreatePerformanceRequest(
        concertId = 1L,
        startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
        bookingOpensAt = LocalDateTime.of(2027, 1, 10, 10, 0),
      )
      given(performanceService.create(request)).willReturn(performanceResponse())

      mockMvc.post("/api/performances") {
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(request)
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isCreated() }
        content { contentTypeCompatibleWith(MediaType.APPLICATION_JSON) }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data.id") { value(1) }
        jsonPath("$.data.concertId") { value(1) }
        jsonPath("$.data.startsAt") { value("2027-01-20T19:00:00") }
        jsonPath("$.data.bookingOpensAt") { value("2027-01-10T10:00:00") }
        jsonPath("$.data.createdAt") { exists() }
      }

      then(performanceService).should().create(request)
    }

    @Test
    fun `필수 필드가 없으면 400을 반환한다`() {
      mockMvc.post("/api/performances") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"concertId":1}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
      }

      then(performanceService).shouldHaveNoInteractions()
    }

    @Test
    fun `일반 사용자가 회차를 생성하면 403을 반환한다`() {
      mockMvc.post("/api/performances") {
        contentType = MediaType.APPLICATION_JSON
        content = """
          {
            "concertId": 1,
            "startsAt": "2027-01-20T19:00:00",
            "bookingOpensAt": "2027-01-10T10:00:00"
          }
        """.trimIndent()
        with(authentication(userAuth))
        with(csrf())
      }.andExpect {
        status { isForbidden() }
      }

      then(performanceService).shouldHaveNoInteractions()
    }

    @Test
    fun `인증 없이 회차를 생성하면 401을 반환한다`() {
      mockMvc.post("/api/performances") {
        contentType = MediaType.APPLICATION_JSON
        content = """
          {
            "concertId": 1,
            "startsAt": "2027-01-20T19:00:00",
            "bookingOpensAt": "2027-01-10T10:00:00"
          }
        """.trimIndent()
        with(csrf())
      }.andExpect {
        status { isUnauthorized() }
      }

      then(performanceService).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("PATCH /api/performances/{id}")
  inner class UpdatePerformance {
    private fun <T> JsonNullable<T>.hasValue(value: T): Boolean = isPresent && get() == value

    private fun updateRequestThat(predicate: (UpdatePerformanceRequest) -> Boolean): UpdatePerformanceRequest = argThat<UpdatePerformanceRequest> {
      predicate(it)
    } ?: UpdatePerformanceRequest()

    @Test
    fun `관리자가 회차를 부분 수정하면 200을 반환한다`() {
      val updatedStartsAt = LocalDateTime.of(2027, 1, 21, 19, 0)
      given(
        performanceService.update(
          eq(1L),
          updateRequestThat { it.startsAt.hasValue(updatedStartsAt) },
        ),
      ).willReturn(performanceResponse(startsAt = updatedStartsAt))

      mockMvc.patch("/api/performances/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"startsAt":"2027-01-21T19:00:00"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isOk() }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data.startsAt") { value("2027-01-21T19:00:00") }
      }
    }

    @Test
    fun `수정 시 null을 허용하지 않는 시각에 null을 전달하면 400을 반환한다`() {
      mockMvc.patch("/api/performances/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"startsAt":null}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
      }

      then(performanceService).shouldHaveNoInteractions()
    }

    @Test
    fun `없는 회차를 수정하면 404를 반환한다`() {
      given(
        performanceService.update(
          eq(99L),
          updateRequestThat { it.startsAt.hasValue(LocalDateTime.of(2027, 1, 21, 19, 0)) },
        ),
      ).willThrow(CustomException(ErrorCode.NOT_FOUND))

      mockMvc.patch("/api/performances/99") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"startsAt":"2027-01-21T19:00:00"}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isNotFound() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(404) }
      }
    }

    @Test
    fun `일반 사용자가 회차를 수정하면 403을 반환한다`() {
      mockMvc.patch("/api/performances/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"startsAt":"2027-01-21T19:00:00"}"""
        with(authentication(userAuth))
        with(csrf())
      }.andExpect {
        status { isForbidden() }
      }

      then(performanceService).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("DELETE /api/performances/{id}")
  inner class DeletePerformance {
    @Test
    fun `관리자가 회차를 삭제하면 200을 반환한다`() {
      mockMvc.delete("/api/performances/1") {
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isOk() }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data") { doesNotExist() }
      }

      then(performanceService).should().delete(1L)
    }

    @Test
    fun `없는 회차를 삭제하면 404를 반환한다`() {
      given(performanceService.delete(99L))
        .willThrow(CustomException(ErrorCode.NOT_FOUND))

      mockMvc.delete("/api/performances/99") {
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isNotFound() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(404) }
      }
    }

    @Test
    fun `일반 사용자가 회차를 삭제하면 403을 반환한다`() {
      mockMvc.delete("/api/performances/1") {
        with(authentication(userAuth))
        with(csrf())
      }.andExpect {
        status { isForbidden() }
      }

      then(performanceService).shouldHaveNoInteractions()
    }
  }
}

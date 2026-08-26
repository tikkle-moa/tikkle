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
import com.example.server.performance.dto.PerformanceDetailResponse
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.dto.SeatResponse
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
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

  private fun performanceDetailResponse(): PerformanceDetailResponse = PerformanceDetailResponse(
    performance = performanceResponse(),
    seats = listOf(
      SeatResponse(
        id = 1L,
        performanceId = 1L,
        sectionName = "A구역",
        seatNumber = 1,
        seatLabel = "A구역 1번",
        price = 15000,
        positionX = BigDecimal("5.23"),
        positionY = BigDecimal("3.27"),
        createdAt = LocalDateTime.of(2026, 7, 31, 13, 0),
      ),
    ),
  )

  @Nested
  @DisplayName("GET /api/performances")
  inner class GetPerformances {
    @Test
    fun `인증 없이 공연 회차 목록을 조회한다`() {
      val performances = listOf(
        performanceResponse(
          id = 1L,
          startsAt = LocalDateTime.of(2026, 7, 25, 19, 0),
          bookingOpensAt = LocalDateTime.of(2026, 7, 20, 19, 0),
        ),
        performanceResponse(
          id = 2L,
          startsAt = LocalDateTime.of(2026, 7, 24, 19, 0),
          bookingOpensAt = LocalDateTime.of(2026, 7, 19, 19, 0),
        ),
      )
      given(performanceService.getPerformances()).willReturn(performances)

      mockMvc.get("/api/performances")
        .andExpect {
          status { isOk() }
          jsonPath("$.success") { value(true) }
          jsonPath("$.data[0].id") { value(1) }
          jsonPath("$.data[0].concertId") { value(1) }
          jsonPath("$.data[0].startsAt") { value("2026-07-25T19:00:00") }
          jsonPath("$.data[0].bookingOpensAt") { value("2026-07-20T19:00:00") }
          jsonPath("$.data[1].id") { value(2) }
          jsonPath("$.data[1].startsAt") { value("2026-07-24T19:00:00") }
        }

      then(performanceService).should().getPerformances()
    }

    @Test
    fun `공연 회차가 없으면 빈 목록을 반환한다`() {
      given(performanceService.getPerformances()).willReturn(emptyList())

      mockMvc.get("/api/performances")
        .andExpect {
          status { isOk() }
          jsonPath("$.success") { value(true) }
          jsonPath("$.data") { isArray() }
          jsonPath("$.data") { isEmpty() }
        }
    }
  }

  @Nested
  @DisplayName("GET /api/performances/{id}")
  inner class GetPerformance {
    @Test
    fun `인증 없이 공연 회차 상세를 조회한다`() {
      given(performanceService.getPerformance(1L)).willReturn(performanceDetailResponse())

      mockMvc.get("/api/performances/1")
        .andExpect {
          status { isOk() }
          jsonPath("$.success") { value(true) }
          jsonPath("$.data.performance.id") { value(1) }
          jsonPath("$.data.performance.concertId") { value(1) }
          jsonPath("$.data.performance.startsAt") { value("2027-01-20T19:00:00") }
          jsonPath("$.data.performance.bookingOpensAt") { value("2027-01-10T10:00:00") }
          jsonPath("$.data.performance.createdAt") { value("2026-08-24T12:00:00") }
          jsonPath("$.data.seats[0].id") { value(1) }
          jsonPath("$.data.seats[0].performanceId") { value(1) }
          jsonPath("$.data.seats[0].sectionName") { value("A구역") }
          jsonPath("$.data.seats[0].seatNumber") { value(1) }
          jsonPath("$.data.seats[0].seatLabel") { value("A구역 1번") }
          jsonPath("$.data.seats[0].price") { value(15000) }
          jsonPath("$.data.seats[0].positionX") { value(5.23) }
          jsonPath("$.data.seats[0].positionY") { value(3.27) }
          jsonPath("$.data.seats[0].createdAt") { value("2026-07-31T13:00:00") }
        }

      then(performanceService).should().getPerformance(1L)
    }

    @Test
    fun `없는 공연 회차를 조회하면 404를 반환한다`() {
      given(performanceService.getPerformance(99L))
        .willThrow(CustomException(ErrorCode.NOT_FOUND))

      mockMvc.get("/api/performances/99")
        .andExpect {
          status { isNotFound() }
          jsonPath("$.success") { value(false) }
          jsonPath("$.error.code") { value(404) }
        }
    }
  }

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
    fun `예매 시작 시각 없이 회차를 생성하면 201을 반환한다`() {
      val request = CreatePerformanceRequest(
        concertId = 1L,
        startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
      )
      given(performanceService.create(request))
        .willReturn(performanceResponse(bookingOpensAt = null))

      mockMvc.post("/api/performances") {
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(request)
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isCreated() }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data.bookingOpensAt") { doesNotExist() }
      }
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
    fun `예매 시작 시각을 null로 수정하면 200을 반환한다`() {
      given(
        performanceService.update(
          eq(1L),
          updateRequestThat {
            it.bookingOpensAt.isPresent && it.bookingOpensAt.get() == null
          },
        ),
      ).willReturn(performanceResponse(bookingOpensAt = null))

      mockMvc.patch("/api/performances/1") {
        contentType = MediaType.APPLICATION_JSON
        content = """{"bookingOpensAt":null}"""
        with(authentication(adminAuth))
        with(csrf())
      }.andExpect {
        status { isOk() }
        jsonPath("$.success") { value(true) }
        jsonPath("$.data.bookingOpensAt") { doesNotExist() }
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

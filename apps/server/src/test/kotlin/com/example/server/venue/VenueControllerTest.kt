package com.example.server.venue

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.config.SecurityConfig
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.global.security.RestAccessDeniedHandler
import com.example.server.global.security.RestAuthenticationEntryPoint
import com.example.server.venue.dto.CreateVenueDetailRequest
import com.example.server.venue.dto.CreateVenueRequest
import com.example.server.venue.dto.VenueDetailResponse
import com.example.server.venue.dto.VenueResponse
import com.example.server.venue.dto.VenueSeatResponse
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
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

@WebMvcTest(VenueController::class)
@Import(SecurityConfig::class, RestAuthenticationEntryPoint::class, RestAccessDeniedHandler::class)
@ActiveProfiles("test")
class VenueControllerTest {
  @Autowired lateinit var mockMvc: MockMvc

  @Autowired lateinit var objectMapper: ObjectMapper

  @MockitoBean lateinit var venueService: VenueService

  @MockitoBean lateinit var appProperties: AppProperties

  @MockitoBean lateinit var jwtProperties: JwtProperties

  @MockitoBean lateinit var jwtTokenProvider: JwtTokenProvider

  private val adminAuth = authentication(UserRole.ADMIN)
  private val userAuth = authentication(UserRole.USER)

  @BeforeEach
  fun setUp() {
    given(appProperties.frontendUrl).willReturn("http://localhost:5173")
    given(appProperties.production).willReturn(false)
    given(jwtProperties.accessTokenExpirationMinutes).willReturn(30L)
    given(jwtProperties.refreshTokenExpirationDays).willReturn(7L)
  }

  @Nested
  @DisplayName("GET /api/venues")
  inner class GetVenues {
    @Test
    fun `공연장 목록을 조회한다`() {
      given(venueService.getAllVenues()).willReturn(listOf(venueResponse()))

      mockMvc.get("/api/venues") { with(authentication(adminAuth)) }.andExpect {
        status { isOk() }
        jsonPath("$.data[0].id") { value(1) }
        jsonPath("$.data[0].name") { value("테스트 공연장") }
      }
    }
  }

  @Nested
  @DisplayName("GET /api/venues/{venueId}")
  inner class GetVenueDetails {
    @Test
    fun `공연장과 좌석 상세를 조회한다`() {
      given(venueService.getVenueDetails(1L)).willReturn(detailResponse())

      mockMvc.get("/api/venues/1") { with(authentication(adminAuth)) }.andExpect {
        status { isOk() }
        jsonPath("$.data.venue.id") { value(1) }
        jsonPath("$.data.venueSeats[0].seatLabel") { value("A구역 1번") }
      }
    }
  }

  @Nested
  @DisplayName("POST /api/venues")
  inner class CreateVenueDetails {
    @Test
    fun `관리자는 공연장과 좌석을 생성한다`() {
      val request = createRequest()
      given(venueService.createVenueDetails(request)).willReturn(detailResponse())

      mockMvc.post("/api/venues") {
        with(authentication(adminAuth))
        with(csrf())
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(request)
      }.andExpect {
        status { isOk() }
        jsonPath("$.data.venue.name") { value("테스트 공연장") }
      }
    }

    @Test
    fun `인증하지 않으면 공연장을 생성할 수 없다`() {
      mockMvc.post("/api/venues") {
        with(csrf())
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(createRequest())
      }.andExpect { status { isUnauthorized() } }

      then(venueService).shouldHaveNoInteractions()
    }

    @Test
    fun `일반 사용자는 공연장을 생성할 수 없다`() {
      mockMvc.post("/api/venues") {
        with(authentication(userAuth))
        with(csrf())
        contentType = MediaType.APPLICATION_JSON
        content = objectMapper.writeValueAsString(createRequest())
      }.andExpect { status { isForbidden() } }
    }
  }

  @Nested
  @DisplayName("PATCH /api/venues/{venueId}")
  inner class UpdateVenueDetails {
    @Test
    fun `관리자는 공연장과 좌석을 수정한다`() {
      given(venueService.updateVenueDetails(org.mockito.ArgumentMatchers.eq(1L), mockAny()))
        .willReturn(detailResponse(name = "수정 공연장"))

      mockMvc.patch("/api/venues/1") {
        with(authentication(adminAuth))
        with(csrf())
        contentType = MediaType.APPLICATION_JSON
        content = """{"venue":{"name":"수정 공연장"}}"""
      }.andExpect {
        status { isOk() }
        jsonPath("$.data.venue.name") { value("수정 공연장") }
      }
    }
  }

  @Nested
  @DisplayName("DELETE /api/venues/{venueId}")
  inner class DeleteVenue {
    @Test
    fun `관리자는 공연장을 삭제한다`() {
      mockMvc.delete("/api/venues/1") {
        with(authentication(adminAuth))
        with(csrf())
      }
        .andExpect { status { isOk() } }

      then(venueService).should().deleteVenue(1L)
    }

    @Test
    fun `CSRF 토큰이 없으면 공연장을 삭제할 수 없다`() {
      mockMvc.delete("/api/venues/1") { with(authentication(adminAuth)) }
        .andExpect { status { isForbidden() } }

      then(venueService).shouldHaveNoInteractions()
    }
  }

  private fun authentication(role: UserRole) = UsernamePasswordAuthenticationToken(
    LoginUserResult(if (role == UserRole.ADMIN) 1L else 2L, role),
    null,
    listOf(SimpleGrantedAuthority("ROLE_${role.name}")),
  )

  private fun createRequest() = CreateVenueDetailRequest(
    venue = CreateVenueRequest(
      name = "테스트 공연장",
      address = "서울",
      width = BigDecimal("100.00"),
      height = BigDecimal("100.00"),
      stagePositionX = BigDecimal("20.00"),
      stagePositionY = BigDecimal("5.00"),
      stageWidth = BigDecimal("40.00"),
      stageHeight = BigDecimal("10.00"),
    ),
  )

  private fun detailResponse(name: String = "테스트 공연장") = VenueDetailResponse(
    venue = venueResponse(name),
    venueSeats = listOf(
      VenueSeatResponse(
        id = 1L, venueId = 1L, sectionName = "A구역", seatNumber = 1, seatLabel = "A구역 1번",
        price = 50_000, positionX = BigDecimal("10.00"), positionY = BigDecimal("20.00"),
        createdAt = LocalDateTime.of(2026, 8, 1, 12, 0),
      ),
    ),
  )

  private fun venueResponse(name: String = "테스트 공연장") = VenueResponse(
    id = 1L, name = name, address = "서울", description = null,
    width = BigDecimal("100.00"), height = BigDecimal("100.00"),
    stagePositionX = BigDecimal("20.00"), stagePositionY = BigDecimal("5.00"),
    stageWidth = BigDecimal("40.00"), stageHeight = BigDecimal("10.00"),
    createdAt = LocalDateTime.of(2026, 8, 1, 12, 0),
  )

  @Suppress("UNCHECKED_CAST")
  private fun <T> mockAny(): T {
    org.mockito.Mockito.any<T>()
    return null as T
  }
}

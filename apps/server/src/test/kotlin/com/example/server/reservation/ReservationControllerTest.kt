package com.example.server.reservation

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.config.SecurityConfig
import com.example.server.config.properties.AppProperties
import com.example.server.config.properties.JwtProperties
import com.example.server.global.security.RestAccessDeniedHandler
import com.example.server.global.security.RestAuthenticationEntryPoint
import com.example.server.reservation.dto.MyReservationResponse
import com.example.server.reservation.dto.ReservationCancellationResult
import com.example.server.reservation.dto.ReservationSeatResponse
import com.example.server.reservation.types.ReservationStatus
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.BDDMockito.given
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.LocalDateTime
import java.util.UUID

@WebMvcTest(ReservationController::class)
@Import(
  SecurityConfig::class,
  RestAuthenticationEntryPoint::class,
  RestAccessDeniedHandler::class,
)
@ActiveProfiles("test")
class ReservationControllerTest {
  @Autowired lateinit var mockMvc: MockMvc

  @MockitoBean lateinit var reservationService: ReservationService

  @MockitoBean lateinit var reservationCancellationService: ReservationCancellationService

  @MockitoBean lateinit var appProperties: AppProperties

  @MockitoBean lateinit var jwtProperties: JwtProperties

  @MockitoBean lateinit var jwtTokenProvider: JwtTokenProvider

  private val userAuth = UsernamePasswordAuthenticationToken(
    LoginUserResult(USER_ID, UserRole.USER),
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

  @Test
  fun `인증 사용자에게 예매 목록 응답을 반환한다`() {
    given(reservationService.getMyReservations(USER_ID)).willReturn(listOf(response()))

    mockMvc.get("/api/reservations") {
      with(authentication(userAuth))
    }.andExpect {
      status { isOk() }
      jsonPath("$.success") { value(true) }
      jsonPath("$.data[0].id") { value(RESERVATION_ID) }
      jsonPath("$.data[0].seats[0].seatLabel") { value("A-12") }
      jsonPath("$.data[0].status") { value("SUCCEEDED") }
    }
  }

  @Test
  fun `예매 상세 조회는 요청한 예매 ID를 서비스로 전달한다`() {
    given(reservationService.getMyReservation(USER_ID, RESERVATION_ID)).willReturn(response())

    mockMvc.get("/api/reservations/$RESERVATION_ID") {
      with(authentication(userAuth))
    }.andExpect {
      status { isOk() }
      jsonPath("$.data.id") { value(RESERVATION_ID) }
    }
  }

  @Test
  fun `예매 취소는 REST 요청으로 서비스에 위임하고 상태를 반환한다`() {
    val requestId = UUID.fromString("06349b76-0c49-49a7-812e-79b81f515fa8")
    val result = ReservationCancellationResult(RESERVATION_ID, ReservationStatus.REFUND_ACCOUNT_REQUIRED)
    given(
      reservationCancellationService.cancelReservation(USER_ID, RESERVATION_ID, requestId, null),
    ).willReturn(result)

    mockMvc.post("/api/reservations/$RESERVATION_ID/cancel") {
      with(authentication(userAuth))
      with(csrf())
      contentType = MediaType.APPLICATION_JSON
      content = """{"requestId":"$requestId"}"""
    }.andExpect {
      status { isOk() }
      jsonPath("$.data.reservationId") { value(RESERVATION_ID) }
      jsonPath("$.data.status") { value("REFUND_ACCOUNT_REQUIRED") }
    }
  }

  @Test
  fun `취소 결과 대사가 필요하면 Accepted와 취소 대기 상태를 반환한다`() {
    val requestId = UUID.fromString("06349b76-0c49-49a7-812e-79b81f515fa8")
    given(
      reservationCancellationService.cancelReservation(USER_ID, RESERVATION_ID, requestId, null),
    ).willReturn(ReservationCancellationResult(RESERVATION_ID, ReservationStatus.CANCELLATION_PENDING))

    mockMvc.post("/api/reservations/$RESERVATION_ID/cancel") {
      with(authentication(userAuth))
      with(csrf())
      contentType = MediaType.APPLICATION_JSON
      content = """{"requestId":"$requestId"}"""
    }.andExpect {
      status { isAccepted() }
      jsonPath("$.data.status") { value("CANCELLATION_PENDING") }
    }
  }

  @Test
  fun `인증되지 않은 사용자는 예매 목록을 조회할 수 없다`() {
    mockMvc.get("/api/reservations").andExpect {
      status { isUnauthorized() }
    }
  }

  private fun response() = MyReservationResponse(
    id = RESERVATION_ID,
    concertTitle = "공연",
    performanceName = "1회차",
    performanceStartsAt = LocalDateTime.of(2026, 12, 18, 19, 0),
    venueName = "공연장",
    seats = listOf(ReservationSeatResponse("A", "A-12")),
    amount = 66_000,
    status = ReservationStatus.SUCCEEDED,
    createdAt = LocalDateTime.of(2026, 9, 30, 12, 0),
  )

  private companion object {
    const val USER_ID = 2L
    const val RESERVATION_ID = 501L
  }
}

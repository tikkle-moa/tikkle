package com.example.server.performance

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.stomp.StompSuccessMessage
import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.HoldVenueSeatsCommand
import com.example.server.performance.dto.PerformanceSeatStatusCommand
import com.example.server.performance.dto.PerformanceSeatStatusMessage
import com.example.server.performance.dto.ReleaseVenueSeatsCommand
import com.example.server.performance.dto.VenueSeatHoldDetail
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.Authentication
import java.time.LocalDateTime
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class PerformanceStompControllerTest {
  @Mock
  lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock
  lateinit var authentication: Authentication

  @InjectMocks
  lateinit var controller: PerformanceStompController

  @Nested
  @DisplayName("GET_SEAT_STATUS")
  inner class GetSeatStatus {
    @Test
    fun `공연 좌석 상태를 조회해 성공 메시지로 반환한다`() {
      val command = PerformanceSeatStatusCommand(REQUEST_ID)
      val result = PerformanceSeatStatusMessage(
        serverTime = LocalDateTime.of(2026, 9, 10, 12, 0),
        bookedSeats = listOf(1L),
        heldSeats = listOf(
          HeldSeat(
            id = 2L,
            expiresAt = LocalDateTime.of(2026, 9, 10, 12, 5),
          ),
        ),
      )

      given(
        redisVenueSeatHoldService.getSeatStatus(PERFORMANCE_ID),
      ).willReturn(result)

      val response = controller.getSeatStatus(
        performanceId = PERFORMANCE_ID,
        command = command,
      )

      assertThat(response)
        .isEqualTo(StompSuccessMessage(REQUEST_ID, result))

      then(redisVenueSeatHoldService)
        .should()
        .getSeatStatus(PERFORMANCE_ID)
    }

    @Test
    fun `좌석 상태 조회 destination과 개인 응답 queue를 사용한다`() {
      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "getSeatStatus",
        Long::class.javaPrimitiveType,
        PerformanceSeatStatusCommand::class.java,
      )

      assertThat(method.getAnnotation(MessageMapping::class.java).value)
        .containsExactly("/{performanceId}/get-seat-status")

      val sendToUser = requireNotNull(
        method.getAnnotation(SendToUser::class.java),
      )

      assertThat(sendToUser.value)
        .containsExactly(
          "/queue/performances/{performanceId}/get-seat-status",
        )

      assertThat(sendToUser.broadcast)
        .isFalse()
    }
  }

  @Nested
  @DisplayName("HOLD_SEATS")
  inner class HoldSeats {
    @Test
    fun `인증 사용자의 좌석을 점유하고 Hold 메시지를 반환한다`() {
      val command = HoldVenueSeatsCommand(
        requestId = REQUEST_ID,
        data = SEAT_IDS,
      )
      val result = VenueSeatHoldDetail(
        holdId = "hold-1",
        groupId = "1:$PERFORMANCE_ID",
        performanceId = PERFORMANCE_ID,
        venueSeatIds = SEAT_IDS,
        expiresAt = LocalDateTime.of(2026, 9, 10, 12, 5),
      )

      given(authentication.principal)
        .willReturn(LoginUserResult(USER_ID, UserRole.USER))

      given(
        redisVenueSeatHoldService.holdVenueSeats(
          USER_ID,
          PERFORMANCE_ID,
          SEAT_IDS,
        ),
      ).willReturn(result)

      val response = controller.hold(
        performanceId = PERFORMANCE_ID,
        command = command,
        authentication = authentication,
      )

      assertThat(response)
        .isEqualTo(StompSuccessMessage(REQUEST_ID, result))

      then(redisVenueSeatHoldService)
        .should()
        .holdVenueSeats(USER_ID, PERFORMANCE_ID, SEAT_IDS)
    }

    @Test
    fun `좌석 점유 destination과 개인 응답 queue를 사용한다`() {
      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "hold",
        Long::class.javaPrimitiveType,
        HoldVenueSeatsCommand::class.java,
        Authentication::class.java,
      )

      assertThat(method.getAnnotation(MessageMapping::class.java).value)
        .containsExactly("/{performanceId}/hold-seats")

      val sendToUser = requireNotNull(
        method.getAnnotation(SendToUser::class.java),
      )

      assertThat(sendToUser.value)
        .containsExactly(
          "/queue/performances/{performanceId}/hold-seats",
        )

      assertThat(sendToUser.broadcast)
        .isFalse()
    }
  }

  @Nested
  @DisplayName("RELEASE_SEATS")
  inner class ReleaseSeats {
    @Test
    fun `인증 사용자의 좌석을 해제하고 좌석 ID를 반환한다`() {
      val command = ReleaseVenueSeatsCommand(
        requestId = REQUEST_ID,
        data = SEAT_IDS,
      )

      given(authentication.principal)
        .willReturn(LoginUserResult(USER_ID, UserRole.USER))

      given(
        redisVenueSeatHoldService.releaseVenueSeats(
          USER_ID,
          PERFORMANCE_ID,
          SEAT_IDS,
        ),
      ).willReturn(SEAT_IDS)

      val response = controller.release(
        performanceId = PERFORMANCE_ID,
        command = command,
        authentication = authentication,
      )

      assertThat(response)
        .isEqualTo(StompSuccessMessage(REQUEST_ID, SEAT_IDS))

      then(redisVenueSeatHoldService)
        .should()
        .releaseVenueSeats(USER_ID, PERFORMANCE_ID, SEAT_IDS)
    }

    @Test
    fun `좌석 해제 destination과 개인 응답 queue를 사용한다`() {
      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "release",
        Long::class.javaPrimitiveType,
        ReleaseVenueSeatsCommand::class.java,
        Authentication::class.java,
      )

      assertThat(method.getAnnotation(MessageMapping::class.java).value)
        .containsExactly("/{performanceId}/release-seats")

      val sendToUser = requireNotNull(
        method.getAnnotation(SendToUser::class.java),
      )

      assertThat(sendToUser.value)
        .containsExactly(
          "/queue/performances/{performanceId}/release-seats",
        )

      assertThat(sendToUser.broadcast)
        .isFalse()
    }
  }

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L

    private val SEAT_IDS = listOf(101L, 102L)

    private val REQUEST_ID = UUID.fromString(
      "2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a",
    )
  }
}

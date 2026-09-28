package com.example.server.performance

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.GetMyGroupHoldsCommand
import com.example.server.performance.dto.GetMyGroupHoldsMessage
import com.example.server.performance.dto.HoldVenueSeatsCommand
import com.example.server.performance.dto.HoldVenueSeatsMessage
import com.example.server.performance.dto.PerformanceSeatStatusCommand
import com.example.server.performance.dto.PerformanceSeatStatusMessage
import com.example.server.performance.dto.PerformanceSeatStatusMessageData
import com.example.server.performance.dto.PerformanceSeatStatusMessageData.HeldSeat
import com.example.server.performance.dto.ReleaseVenueSeatsCommand
import com.example.server.performance.dto.ReleaseVenueSeatsMessage
import com.example.server.performance.dto.VenueSeatHoldDetail
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
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
      val result = PerformanceSeatStatusMessageData(
        serverTime = LocalDateTime.of(2026, 9, 10, 12, 0),
        bookedSeatIds = listOf(1L),
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
        .isEqualTo(PerformanceSeatStatusMessage(REQUEST_ID, result))

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
  @DisplayName("GET_MY_HELD_SEATS")
  inner class GetMyHeldSeats {
    @Test
    fun `인증 사용자의 Hold 좌석을 조회해 개인 메시지로 반환한다`() {
      val command = GetMyGroupHoldsCommand(REQUEST_ID, sessionId = SESSION_ID)
      val heldSeats = listOf(
        VenueSeatHoldDetail(
          holdId = "hold-1",
          groupId = "$USER_ID:$PERFORMANCE_ID:$SESSION_ID",
          performanceId = PERFORMANCE_ID,
          venueSeatIds = SEAT_IDS,
          expiresAt = LocalDateTime.of(2026, 9, 10, 12, 5),
        ),
      )
      given(authentication.principal).willReturn(LoginUserResult(USER_ID, UserRole.USER))
      given(redisVenueSeatHoldService.getMyGroupHolds(USER_ID, PERFORMANCE_ID, SESSION_ID)).willReturn(heldSeats)

      val response = controller.getMyGroupHolds(PERFORMANCE_ID, command, authentication)

      assertThat(response).isEqualTo(
        GetMyGroupHoldsMessage(
          requestId = REQUEST_ID,
          data = heldSeats,
        ),
      )
      then(redisVenueSeatHoldService).should().getMyGroupHolds(USER_ID, PERFORMANCE_ID, SESSION_ID)
    }

    @Test
    fun `내 Hold 조회 destination과 개인 응답 queue를 사용한다`() {
      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "getMyGroupHolds",
        Long::class.javaPrimitiveType,
        GetMyGroupHoldsCommand::class.java,
        Authentication::class.java,
      )

      assertThat(method.getAnnotation(MessageMapping::class.java).value)
        .containsExactly("/{performanceId}/get-my-group-holds")
      val sendToUser = requireNotNull(method.getAnnotation(SendToUser::class.java))
      assertThat(sendToUser.value).containsExactly("/queue/performances/{performanceId}/get-my-group-holds")
      assertThat(sendToUser.broadcast).isFalse()
    }
  }

  @Test
  fun `로그인 사용자가 아니면 개인 좌석 명령을 모두 거부한다`() {
    given(authentication.principal).willReturn("anonymousUser")

    assertThat(
      assertThrows<CustomException> {
        controller.getMyGroupHolds(PERFORMANCE_ID, GetMyGroupHoldsCommand(REQUEST_ID), authentication)
      },
    ).extracting(CustomException::errorCode).isEqualTo(ErrorCode.UNAUTHORIZED)
    assertThat(
      assertThrows<CustomException> {
        controller.holdSeats(PERFORMANCE_ID, HoldVenueSeatsCommand(REQUEST_ID, SEAT_IDS), authentication)
      },
    ).extracting(CustomException::errorCode).isEqualTo(ErrorCode.UNAUTHORIZED)
    assertThat(
      assertThrows<CustomException> {
        controller.releaseSeats(PERFORMANCE_ID, ReleaseVenueSeatsCommand(REQUEST_ID, SEAT_IDS), authentication)
      },
    ).extracting(CustomException::errorCode).isEqualTo(ErrorCode.UNAUTHORIZED)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Nested
  @DisplayName("HOLD_SEATS")
  inner class HoldSeats {
    @Test
    fun `인증 사용자의 좌석을 점유하고 Hold 메시지를 반환한다`() {
      val command = HoldVenueSeatsCommand(
        requestId = REQUEST_ID,
        data = SEAT_IDS,
        sessionId = SESSION_ID,
      )
      val result = VenueSeatHoldDetail(
        holdId = "hold-1",
        groupId = "1:$PERFORMANCE_ID:$SESSION_ID",
        performanceId = PERFORMANCE_ID,
        venueSeatIds = SEAT_IDS,
        expiresAt = LocalDateTime.of(2026, 9, 10, 12, 5),
      )

      given(authentication.principal)
        .willReturn(LoginUserResult(USER_ID, UserRole.USER))

      given(
        redisVenueSeatHoldService.holdSeats(
          USER_ID,
          PERFORMANCE_ID,
          SEAT_IDS,
          SESSION_ID,
        ),
      ).willReturn(result)

      val response = controller.holdSeats(
        performanceId = PERFORMANCE_ID,
        command = command,
        authentication = authentication,
      )

      assertThat(response)
        .isEqualTo(HoldVenueSeatsMessage(REQUEST_ID, result))

      then(redisVenueSeatHoldService)
        .should()
        .holdSeats(USER_ID, PERFORMANCE_ID, SEAT_IDS, SESSION_ID)
    }

    @Test
    fun `좌석 점유 destination과 개인 응답 queue를 사용한다`() {
      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "holdSeats",
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
        sessionId = SESSION_ID,
      )

      given(authentication.principal)
        .willReturn(LoginUserResult(USER_ID, UserRole.USER))

      given(
        redisVenueSeatHoldService.releaseSeats(
          USER_ID,
          PERFORMANCE_ID,
          SEAT_IDS,
          SESSION_ID,
        ),
      ).willReturn(SEAT_IDS)

      val response = controller.releaseSeats(
        performanceId = PERFORMANCE_ID,
        command = command,
        authentication = authentication,
      )

      assertThat(response)
        .isEqualTo(ReleaseVenueSeatsMessage(REQUEST_ID, SEAT_IDS))

      then(redisVenueSeatHoldService)
        .should()
        .releaseSeats(USER_ID, PERFORMANCE_ID, SEAT_IDS, SESSION_ID)
    }

    @Test
    fun `좌석 해제 destination과 개인 응답 queue를 사용한다`() {
      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "releaseSeats",
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
    private val SESSION_ID = UUID.fromString("88974819-50e7-4127-ae98-b178e3ec2346")
  }
}

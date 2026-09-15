package com.example.server.performance

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.PerformanceSeatHoldCommand
import com.example.server.performance.dto.PerformanceSeatListResponse
import com.example.server.performance.dto.PerformanceSyncCommand
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
  @Mock lateinit var performanceService: PerformanceService

  @Mock lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock lateinit var authentication: Authentication

  @InjectMocks lateinit var controller: PerformanceStompController

  @Nested
  @DisplayName("GET_PERFORMANCE_SEAT_SYNC")
  inner class Sync {
    @Test
    fun `공연 회차의 좌석 상태를 조회해 성공 응답으로 반환한다`() {
      val command = PerformanceSyncCommand(REQUEST_ID, ACTION)
      val result = PerformanceSeatListResponse(
        serverTime = LocalDateTime.of(2026, 9, 10, 12, 0),
        bookedSeats = listOf(1L),
        heldSeats = listOf(HeldSeat(2L, LocalDateTime.of(2026, 9, 10, 12, 5))),
      )
      given(performanceService.getSeatsStatus(PERFORMANCE_ID)).willReturn(result)

      val response = controller.sync(PERFORMANCE_ID, command)

      assertThat(response).isEqualTo(StompCommandSuccess(REQUEST_ID, ACTION, result))
      then(performanceService).should().getSeatsStatus(PERFORMANCE_ID)
    }

    @Test
    fun `공연 회차 경로 변수를 포함한 개인 응답 주소를 사용한다`() {
      val classMapping = requireNotNull(
        PerformanceStompController::class.java.getAnnotation(MessageMapping::class.java),
      )
      assertThat(classMapping.value).containsExactly("/performances")

      val method = PerformanceStompController::class.java.getDeclaredMethod(
        "sync",
        Long::class.javaPrimitiveType,
        PerformanceSyncCommand::class.java,
      )
      assertThat(method.getAnnotation(MessageMapping::class.java).value)
        .containsExactly("/{performanceId}/sync")

      val sendToUser = requireNotNull(method.getAnnotation(SendToUser::class.java))
      assertThat(sendToUser.value).containsExactly("/queue/performances/{performanceId}/sync")
      assertThat(sendToUser.broadcast).isFalse()
    }
  }

  @Test
  fun `HOLD_SEATS는 인증 사용자와 공연 회차를 Hold 서비스에 전달한다`() {
    val command = PerformanceSeatHoldCommand.Hold(
      requestId = REQUEST_ID,
      data = PerformanceSeatHoldCommand.Data(listOf(101L, 102L)),
    )
    val detail = VenueSeatHoldDetail(
      holdId = "hold-1",
      groupId = "1:$PERFORMANCE_ID",
      performanceId = PERFORMANCE_ID,
      venueSeatIds = listOf(101L, 102L),
      expiresAt = LocalDateTime.now().plusMinutes(5),
    )
    given(authentication.principal).willReturn(LoginUserResult(USER_ID, UserRole.USER))
    given(redisVenueSeatHoldService.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 102L))).willReturn(detail)

    val response = controller.hold(PERFORMANCE_ID, command, authentication)

    assertThat(response).isEqualTo(StompCommandSuccess(REQUEST_ID, "HOLD_SEATS", detail))
    then(redisVenueSeatHoldService).should().holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 102L))
  }

  @Test
  fun `RELEASE_SEATS는 인증 사용자의 좌석을 해제하고 요청 데이터를 반환한다`() {
    val command = PerformanceSeatHoldCommand.Release(
      requestId = REQUEST_ID,
      data = PerformanceSeatHoldCommand.Data(listOf(101L, 102L)),
    )
    given(authentication.principal).willReturn(LoginUserResult(USER_ID, UserRole.USER))
    given(redisVenueSeatHoldService.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 102L)))
      .willReturn(listOf(101L, 102L))

    val response = controller.hold(PERFORMANCE_ID, command, authentication)

    assertThat(response).isEqualTo(StompCommandSuccess(REQUEST_ID, "RELEASE_SEATS", command.data))
    then(redisVenueSeatHoldService).should().releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 102L))
  }

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 1L
    private const val ACTION = "GET_PERFORMANCE_SEAT_SYNC"
    private val REQUEST_ID = UUID.fromString("2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a")
  }
}

package com.example.server.performance

import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.PerformanceSeatListResponse
import com.example.server.performance.dto.PerformanceSyncCommand
import com.example.server.performance.dto.PerformanceSyncData
import jakarta.validation.Validation
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
import java.time.LocalDateTime
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class PerformanceStompControllerTest {
  @Mock
  lateinit var performanceService: PerformanceService

  @InjectMocks
  lateinit var performanceStompController: PerformanceStompController

  @Nested
  @DisplayName("SEND /api/performances/sync")
  inner class Sync {
    @Test
    fun `현재 예매 상태를 조회하고 성공 응답을 반환한다`() {
      val command = PerformanceSyncCommand(
        requestId = REQUEST_ID,
        action = ACTION,
        data = PerformanceSyncData(performanceId = PERFORMANCE_ID),
      )
      val result = PerformanceSeatListResponse(
        serverTime = LocalDateTime.of(2026, 9, 10, 12, 0),
        bookedSeats = listOf(1L),
        heldSeats = listOf(HeldSeat(id = 2L, expiresAt = LocalDateTime.of(2026, 9, 10, 12, 5))),
      )
      given(performanceService.getSeatsStatus(PERFORMANCE_ID)).willReturn(result)

      val response = performanceStompController.sync(command)

      assertThat(response).isEqualTo(
        StompCommandSuccess(
          requestId = REQUEST_ID,
          action = ACTION,
          data = result,
        ),
      )
      then(performanceService).should().getSeatsStatus(PERFORMANCE_ID)
    }

    @Test
    fun `요청 STOMP 세션의 performances queue로 응답한다`() {
      val controllerMapping = PerformanceStompController::class.java
        .getAnnotation(MessageMapping::class.java)
      assertThat(controllerMapping.value).containsExactly("/performances")

      val syncMethod = PerformanceStompController::class.java.getDeclaredMethod(
        "sync",
        PerformanceSyncCommand::class.java,
      )

      assertThat(syncMethod.getAnnotation(MessageMapping::class.java).value)
        .containsExactly("/sync")

      val sendToUser = requireNotNull(syncMethod.getAnnotation(SendToUser::class.java))
      assertThat(sendToUser.value).containsExactly("/queue/performances")
      assertThat(sendToUser.broadcast).isFalse()
    }

    @Test
    fun `지원하지 않는 action이면 검증에 실패한다`() {
      val validator = Validation.buildDefaultValidatorFactory().validator
      val command = PerformanceSyncCommand(
        requestId = REQUEST_ID,
        action = "GET_CURRENT_STATUS",
        data = PerformanceSyncData(performanceId = PERFORMANCE_ID),
      )

      val violations = validator.validate(command)

      assertThat(violations)
        .extracting<String> { it.message }
        .containsExactly("지원하지 않는 공연 동기화 명령입니다.")
    }
  }

  companion object {
    private const val PERFORMANCE_ID = 1L
    private const val ACTION = "GET_PERFORMANCE_SEAT_SYNC"
    private val REQUEST_ID = UUID.fromString("2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a")
  }
}

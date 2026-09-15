package com.example.server.performance

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.dto.PerformanceSeatHoldCommand
import com.example.server.performance.dto.PerformanceSeatListResponse
import com.example.server.performance.dto.PerformanceSyncCommand
import jakarta.validation.Valid
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/performances")
class PerformanceStompController(
  private val performanceService: PerformanceService,
  private val redisVenueSeatHoldService: RedisVenueSeatHoldService,
) {
  @MessageMapping("/{performanceId}/sync")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/sync"],
    broadcast = false,
  )
  fun sync(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: PerformanceSyncCommand,
  ): StompCommandSuccess<PerformanceSeatListResponse> {
    val result = performanceService.getSeatsStatus(performanceId)

    return StompCommandSuccess(
      requestId = command.requestId,
      action = command.action,
      data = result,
    )
  }

  @MessageMapping("/{performanceId}/seat-holds")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/seat-holds"],
    broadcast = false,
  )
  fun hold(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: PerformanceSeatHoldCommand<*>,
    authentication: Authentication,
  ): StompCommandSuccess<*> {
    val loginUser = authentication.principal as LoginUserResult
    return when (command) {
      is PerformanceSeatHoldCommand.Hold -> StompCommandSuccess(
        requestId = command.requestId,
        action = command.action,
        data = redisVenueSeatHoldService.holdVenueSeats(loginUser.userId, performanceId, command.data.venueSeatIds),
      )
      is PerformanceSeatHoldCommand.Release -> {
        redisVenueSeatHoldService.releaseVenueSeats(loginUser.userId, performanceId, command.data.venueSeatIds)
        StompCommandSuccess(
          requestId = command.requestId,
          action = command.action,
          data = command.data,
        )
      }
    }
  }
}

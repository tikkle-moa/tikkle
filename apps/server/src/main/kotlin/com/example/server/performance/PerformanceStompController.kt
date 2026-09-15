package com.example.server.performance

import com.example.server.auth.dto.LoginUserResult
import com.example.server.performance.dto.HoldVenueSeatsCommand
import com.example.server.performance.dto.HoldVenueSeatsMessage
import com.example.server.performance.dto.PerformanceSeatStatusCommand
import com.example.server.performance.dto.PerformanceSeatStatusMessage
import com.example.server.performance.dto.ReleaseVenueSeatsCommand
import com.example.server.performance.dto.ReleaseVenueSeatsMessage
import jakarta.validation.Valid
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/performances")
class PerformanceStompController(private val redisVenueSeatHoldService: RedisVenueSeatHoldService) {
  @MessageMapping("/{performanceId}/get-seat-status")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/get-seat-status"],
    broadcast = false,
  )
  fun getSeatStatus(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: PerformanceSeatStatusCommand,
  ): PerformanceSeatStatusMessage {
    val result = redisVenueSeatHoldService.getSeatStatus(performanceId)

    return PerformanceSeatStatusMessage(
      requestId = command.requestId,
      data = result,
    )
  }

  @MessageMapping("/{performanceId}/hold-seats")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/hold-seats"],
    broadcast = false,
  )
  fun hold(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: HoldVenueSeatsCommand,
    authentication: Authentication,
  ): HoldVenueSeatsMessage {
    val loginUser = authentication.principal as LoginUserResult
    return HoldVenueSeatsMessage(
      requestId = command.requestId,
      data = redisVenueSeatHoldService.holdVenueSeats(
        loginUser.userId,
        performanceId,
        command.data,
      ),
    )
  }

  @MessageMapping("/{performanceId}/release-seats")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/release-seats"],
    broadcast = false,
  )
  fun release(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: ReleaseVenueSeatsCommand,
    authentication: Authentication,
  ): ReleaseVenueSeatsMessage {
    val loginUser = authentication.principal as LoginUserResult
    redisVenueSeatHoldService.releaseVenueSeats(
      loginUser.userId,
      performanceId,
      command.data,
    )
    return ReleaseVenueSeatsMessage(
      requestId = command.requestId,
      data = command.data,
    )
  }
}

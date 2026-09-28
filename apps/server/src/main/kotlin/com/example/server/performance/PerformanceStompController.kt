package com.example.server.performance

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.GetMyGroupHoldsCommand
import com.example.server.performance.dto.GetMyGroupHoldsMessage
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

  @MessageMapping("/{performanceId}/get-my-group-holds")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/get-my-group-holds"],
    broadcast = false,
  )
  fun getMyGroupHolds(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: GetMyGroupHoldsCommand,
    authentication: Authentication,
  ): GetMyGroupHoldsMessage {
    val user = loginUser(authentication)
    val result = redisVenueSeatHoldService.getMyGroupHolds(user.userId, performanceId, command.sessionId)

    return GetMyGroupHoldsMessage(
      requestId = command.requestId,
      data = result,
    )
  }

  @MessageMapping("/{performanceId}/hold-seats")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/hold-seats"],
    broadcast = false,
  )
  fun holdSeats(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: HoldVenueSeatsCommand,
    authentication: Authentication,
  ): HoldVenueSeatsMessage {
    val user = loginUser(authentication)
    val result = redisVenueSeatHoldService.holdSeats(user.userId, performanceId, command.data, command.sessionId)

    return HoldVenueSeatsMessage(
      requestId = command.requestId,
      data = result,
    )
  }

  @MessageMapping("/{performanceId}/release-seats")
  @SendToUser(
    value = ["/queue/performances/{performanceId}/release-seats"],
    broadcast = false,
  )
  fun releaseSeats(
    @DestinationVariable("performanceId") performanceId: Long,
    @Payload @Valid command: ReleaseVenueSeatsCommand,
    authentication: Authentication,
  ): ReleaseVenueSeatsMessage {
    val user = loginUser(authentication)
    redisVenueSeatHoldService.releaseSeats(user.userId, performanceId, command.data, command.sessionId)

    return ReleaseVenueSeatsMessage(
      requestId = command.requestId,
      data = command.data,
    )
  }

  private fun loginUser(authentication: Authentication): LoginUserResult = authentication.principal as? LoginUserResult
    ?: throw CustomException(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.")
}

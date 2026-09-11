package com.example.server.performance

import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.dto.PerformanceSeatListResponse
import com.example.server.performance.dto.PerformanceSyncCommand
import jakarta.validation.Valid
import org.springframework.messaging.handler.annotation.DestinationVariable
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/performances")
class PerformanceStompController(private val performanceService: PerformanceService) {
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
}

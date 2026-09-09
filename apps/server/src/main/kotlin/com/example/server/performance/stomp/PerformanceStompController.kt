package com.example.server.performance.stomp

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.stomp.dto.PerformanceSyncCommand
import com.example.server.performance.stomp.dto.StartCheckoutCommand
import com.example.server.reservation.ReservationCheckoutService
import com.example.server.reservation.dto.StartCheckoutResult
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller

@Controller
class PerformanceStompController(private val reservationCheckoutService: ReservationCheckoutService) {
  @MessageMapping("/performance/sync")
  @SendToUser("/queue/performance")
  fun sync(command: PerformanceSyncCommand<*>, @AuthenticationPrincipal loginUser: LoginUserResult): StompCommandSuccess<StartCheckoutResult> {
    if (command !is StartCheckoutCommand) {
      throw CustomException(
        ErrorCode.BAD_REQUEST,
        "아직 지원하지 않는 결제 명령입니다.",
      )
    }

    val result = reservationCheckoutService.startCheckout(
      userId = loginUser.userId,
      holdId = command.data.holdId,
    )

    return StompCommandSuccess(
      requestId = command.requestId,
      action = command.action,
      data = result,
    )
  }
}

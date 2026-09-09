package com.example.server.performance.stomp

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.stomp.dto.CancelPaymentCommand
import com.example.server.performance.stomp.dto.ConfirmPaymentCommand
import com.example.server.performance.stomp.dto.PerformanceSyncCommand
import com.example.server.performance.stomp.dto.StartCheckoutCommand
import com.example.server.reservation.ReservationCheckoutService
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller

@Controller
class PerformanceStompController(private val reservationCheckoutService: ReservationCheckoutService) {
  @MessageMapping("/performance/sync")
  @SendToUser(
    value = ["/queue/performance"],
    broadcast = false,
  )
  fun sync(command: PerformanceSyncCommand<*>, @AuthenticationPrincipal loginUser: LoginUserResult): StompCommandSuccess<out Any> = when (command) {
    is StartCheckoutCommand -> {
      val result = reservationCheckoutService.startCheckout(
        userId = loginUser.userId,
        holdId = command.data.holdId,
      )

      StompCommandSuccess(
        requestId = command.requestId,
        action = command.action,
        data = result,
      )
    }

    is CancelPaymentCommand -> {
      val result = reservationCheckoutService.cancelCheckout(
        userId = loginUser.userId,
        reservationId = command.data.reservationId,
      )

      StompCommandSuccess(
        requestId = command.requestId,
        action = command.action,
        data = result,
      )
    }

    is ConfirmPaymentCommand -> {
      throw CustomException(
        ErrorCode.BAD_REQUEST,
        "아직 지원하지 않는 결제 명령입니다.",
      )
    }
  }
}

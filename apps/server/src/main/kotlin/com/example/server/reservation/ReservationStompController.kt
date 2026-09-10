package com.example.server.reservation

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.reservation.dto.CancelPaymentCommand
import com.example.server.reservation.dto.ConfirmPaymentCommand
import com.example.server.reservation.dto.ReservationSyncCommand
import com.example.server.reservation.dto.StartCheckoutCommand
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller

@Controller
class ReservationStompController(private val reservationCheckoutService: ReservationCheckoutService) {
  @MessageMapping("/reservation/sync")
  @SendToUser(
    value = ["/queue/reservation"],
    broadcast = false,
  )
  fun sync(command: ReservationSyncCommand<*>, @AuthenticationPrincipal loginUser: LoginUserResult): StompCommandSuccess<out Any> = when (command) {
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

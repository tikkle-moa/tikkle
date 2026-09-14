package com.example.server.reservation

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.reservation.dto.CancelPaymentCommand
import com.example.server.reservation.dto.ConfirmPaymentCommand
import com.example.server.reservation.dto.GetPaymentOrderCommand
import com.example.server.reservation.dto.ReservationSyncCommand
import com.example.server.reservation.dto.StartCheckoutCommand
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.stereotype.Controller

@Controller
class ReservationStompController(
  private val reservationCheckoutService: ReservationCheckoutService,
  private val reservationPaymentOrderService: ReservationPaymentOrderService,
  private val reservationPaymentService: ReservationPaymentService,
) {
  @MessageMapping("/reservation/sync")
  @SendToUser(
    value = ["/queue/reservation"],
    broadcast = false,
  )
  fun sync(@Payload command: ReservationSyncCommand<*>, @AuthenticationPrincipal loginUser: LoginUserResult): StompCommandSuccess<out Any> =
    when (command) {
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

      is GetPaymentOrderCommand -> {
        val result = reservationPaymentOrderService.getPaymentOrder(
          userId = loginUser.userId,
          reservationId = command.data.reservationId,
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
        val result = reservationPaymentService.confirmPayment(
          userId = loginUser.userId,
          paymentKey = command.data.paymentKey,
          orderId = command.data.orderId,
          amount = command.data.amount,
        )

        StompCommandSuccess(
          requestId = command.requestId,
          action = command.action,
          data = result,
        )
      }
    }
}

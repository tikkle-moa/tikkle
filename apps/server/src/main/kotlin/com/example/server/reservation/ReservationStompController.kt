package com.example.server.reservation

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.stomp.StompSuccessMessage
import com.example.server.reservation.dto.CancelCheckoutMessage
import com.example.server.reservation.dto.CancelPaymentCommand
import com.example.server.reservation.dto.ConfirmPaymentCommand
import com.example.server.reservation.dto.ConfirmPaymentMessage
import com.example.server.reservation.dto.GetPaymentOrderCommand
import com.example.server.reservation.dto.PaymentOrderMessage
import com.example.server.reservation.dto.StartCheckoutCommand
import com.example.server.reservation.dto.StartCheckoutMessage
import jakarta.validation.Valid
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Controller

@Controller
class ReservationStompController(
  private val reservationCheckoutService: ReservationCheckoutService,
  private val reservationPaymentOrderService: ReservationPaymentOrderService,
  private val reservationPaymentService: ReservationPaymentService,
) {
  @MessageMapping("/reservation/start-checkout")
  @SendToUser(
    value = ["/queue/reservation/start-checkout"],
    broadcast = false,
  )
  fun startCheckout(@Payload @Valid request: StartCheckoutCommand, authentication: Authentication): StompSuccessMessage<StartCheckoutMessage> {
    val user = loginUser(authentication)

    return StompSuccessMessage(
      requestId = request.requestId,
      data = reservationCheckoutService.startCheckout(
        userId = user.userId,
        performanceId = request.data.performanceId,
      ),
    )
  }

  @MessageMapping("/reservation/get-payment-order")
  @SendToUser(
    value = ["/queue/reservation/get-payment-order"],
    broadcast = false,
  )
  fun getPaymentOrder(@Payload @Valid request: GetPaymentOrderCommand, authentication: Authentication): StompSuccessMessage<PaymentOrderMessage> {
    val user = loginUser(authentication)

    return StompSuccessMessage(
      requestId = request.requestId,
      data = reservationPaymentOrderService.getPaymentOrder(
        userId = user.userId,
        reservationId = request.data.reservationId,
      ),
    )
  }

  @MessageMapping("/reservation/confirm-payment")
  @SendToUser(
    value = ["/queue/reservation/confirm-payment"],
    broadcast = false,
  )
  fun confirmPayment(@Payload @Valid request: ConfirmPaymentCommand, authentication: Authentication): StompSuccessMessage<ConfirmPaymentMessage> {
    val user = loginUser(authentication)

    return StompSuccessMessage(
      requestId = request.requestId,
      data = reservationPaymentService.confirmPayment(
        userId = user.userId,
        paymentKey = request.data.paymentKey,
        orderId = request.data.orderId,
        amount = request.data.amount,
      ),
    )
  }

  @MessageMapping("/reservation/cancel-payment")
  @SendToUser(
    value = ["/queue/reservation/cancel-payment"],
    broadcast = false,
  )
  fun cancelPayment(@Payload @Valid request: CancelPaymentCommand, authentication: Authentication): StompSuccessMessage<CancelCheckoutMessage> {
    val user = loginUser(authentication)

    return StompSuccessMessage(
      requestId = request.requestId,
      data = reservationCheckoutService.cancelCheckout(
        userId = user.userId,
        reservationId = request.data.reservationId,
      ),
    )
  }

  private fun loginUser(authentication: Authentication): LoginUserResult = authentication.principal as? LoginUserResult
    ?: throw CustomException(ErrorCode.UNAUTHORIZED)
}

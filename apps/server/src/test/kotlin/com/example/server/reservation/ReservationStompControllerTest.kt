package com.example.server.reservation

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.reservation.dto.CancelCheckoutResult
import com.example.server.reservation.dto.CancelPaymentCommand
import com.example.server.reservation.dto.CancelPaymentData
import com.example.server.reservation.dto.ConfirmPaymentCommand
import com.example.server.reservation.dto.ConfirmPaymentData
import com.example.server.reservation.dto.ReservationSyncCommand
import com.example.server.reservation.dto.StartCheckoutCommand
import com.example.server.reservation.dto.StartCheckoutData
import com.example.server.reservation.dto.StartCheckoutResult
import com.example.server.reservation.payment.dto.ConfirmPaymentResult
import com.example.server.reservation.types.ReservationStatus
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
import org.springframework.messaging.simp.annotation.SendToUser
import java.time.LocalDateTime
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class ReservationStompControllerTest {
  @Mock
  lateinit var reservationCheckoutService: ReservationCheckoutService

  @Mock
  lateinit var reservationPaymentService: ReservationPaymentService

  @InjectMocks
  lateinit var reservationStompController: ReservationStompController

  private val loginUser = LoginUserResult(
    userId = USER_ID,
    role = UserRole.USER,
  )

  @Test
  fun `예매 sync 응답은 요청 STOMP 세션에만 전송한다`() {
    val syncMethod = ReservationStompController::class.java.getDeclaredMethod(
      "sync",
      ReservationSyncCommand::class.java,
      LoginUserResult::class.java,
    )

    val sendToUser = requireNotNull(
      syncMethod.getAnnotation(SendToUser::class.java),
    )

    assertThat(sendToUser.value)
      .containsExactly("/queue/reservation")
    assertThat(sendToUser.broadcast)
      .isFalse()
  }

  @Nested
  @DisplayName("START_CHECKOUT")
  inner class StartCheckout {
    @Test
    fun `예매 checkout 서비스에 위임하고 성공 응답을 반환한다`() {
      val command = StartCheckoutCommand(
        requestId = REQUEST_ID,
        data = StartCheckoutData(HOLD_ID),
      )
      val result = startCheckoutResult()

      given(
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID),
      ).willReturn(result)

      val response = reservationStompController.sync(
        command = command,
        loginUser = loginUser,
      )

      assertThat(response).isEqualTo(
        StompCommandSuccess(
          requestId = REQUEST_ID,
          action = "START_CHECKOUT",
          data = result,
        ),
      )

      then(reservationCheckoutService)
        .should()
        .startCheckout(USER_ID, HOLD_ID)
    }
  }

  @Nested
  @DisplayName("CANCEL_PAYMENT")
  inner class CancelPayment {
    @Test
    fun `예매 checkout 취소 서비스에 위임하고 성공 응답을 반환한다`() {
      val command = CancelPaymentCommand(
        requestId = REQUEST_ID,
        data = CancelPaymentData(reservationId = RESERVATION_ID),
      )
      val result = CancelCheckoutResult(
        reservationId = RESERVATION_ID,
        status = ReservationStatus.CANCELLED,
      )

      given(
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID),
      ).willReturn(result)

      val response = reservationStompController.sync(
        command = command,
        loginUser = loginUser,
      )

      assertThat(response).isEqualTo(
        StompCommandSuccess(
          requestId = REQUEST_ID,
          action = "CANCEL_PAYMENT",
          data = result,
        ),
      )

      then(reservationCheckoutService)
        .should()
        .cancelCheckout(USER_ID, RESERVATION_ID)
    }
  }

  @Nested
  @DisplayName("CONFIRM_PAYMENT")
  inner class ConfirmPayment {
    @Test
    fun `결제 승인 서비스에 위임하고 성공 응답을 반환한다`() {
      val command = ConfirmPaymentCommand(
        requestId = REQUEST_ID,
        data = ConfirmPaymentData(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        ),
      )
      val result = ConfirmPaymentResult(
        reservationId = RESERVATION_ID,
        status = ReservationStatus.SUCCEEDED,
      )

      given(
        reservationPaymentService.confirmPayment(
          userId = USER_ID,
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        ),
      ).willReturn(result)

      val response = reservationStompController.sync(
        command = command,
        loginUser = loginUser,
      )

      assertThat(response).isEqualTo(
        StompCommandSuccess(
          requestId = REQUEST_ID,
          action = "CONFIRM_PAYMENT",
          data = result,
        ),
      )

      then(reservationPaymentService)
        .should()
        .confirmPayment(
          userId = USER_ID,
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        )
      then(reservationCheckoutService).shouldHaveNoInteractions()
    }
  }

  private fun startCheckoutResult() = StartCheckoutResult(
    reservationId = RESERVATION_ID,
    orderId = ORDER_ID,
    orderName = "아이유 콘서트 1회차 2석",
    amount = AMOUNT,
    paymentExpiresAt = LocalDateTime.of(2027, 1, 20, 19, 5),
  )

  companion object {
    private const val USER_ID = 1L
    private const val HOLD_ID = "hold-123"
    private const val RESERVATION_ID = 501L
    private const val PAYMENT_KEY = "payment-key"
    private const val ORDER_ID = "order-id"
    private const val AMOUNT = 132_000
    private val REQUEST_ID = UUID.fromString("2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a")
  }
}

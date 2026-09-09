package com.example.server.performance.stomp

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.global.stomp.dto.StompCommandSuccess
import com.example.server.performance.stomp.dto.ConfirmPaymentCommand
import com.example.server.performance.stomp.dto.ConfirmPaymentData
import com.example.server.performance.stomp.dto.PerformanceSyncCommand
import com.example.server.performance.stomp.dto.StartCheckoutCommand
import com.example.server.performance.stomp.dto.StartCheckoutData
import com.example.server.reservation.ReservationCheckoutService
import com.example.server.reservation.dto.StartCheckoutResult
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.time.LocalDateTime
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class PerformanceStompControllerTest {
  @Mock
  lateinit var reservationCheckoutService: ReservationCheckoutService

  @InjectMocks
  lateinit var performanceStompController: PerformanceStompController

  private val loginUser = LoginUserResult(
    userId = USER_ID,
    role = UserRole.USER,
  )

  @Test
  fun `START_CHECKOUT 명령을 예약 결제 서비스에 위임하고 성공 응답을 반환한다`() {
    val command = StartCheckoutCommand(
      requestId = REQUEST_ID,
      data = StartCheckoutData(HOLD_ID),
    )
    val result = startCheckoutResult()

    given(
      reservationCheckoutService.startCheckout(USER_ID, HOLD_ID),
    ).willReturn(result)

    val response = performanceStompController.sync(
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

  @Test
  fun `START_CHECKOUT 이외의 명령은 BAD_REQUEST를 던진다`() {
    val command: PerformanceSyncCommand<*> = ConfirmPaymentCommand(
      requestId = REQUEST_ID,
      data = ConfirmPaymentData(
        paymentKey = "payment-key",
        orderId = "order-id",
        amount = 132_000,
      ),
    )

    val exception = assertThrows<CustomException> {
      performanceStompController.sync(
        command = command,
        loginUser = loginUser,
      )
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    then(reservationCheckoutService).shouldHaveNoInteractions()
  }

  private fun startCheckoutResult() = StartCheckoutResult(
    reservationId = 501L,
    orderId = "tikkle-order-501",
    orderName = "아이유 콘서트 1회차 2석",
    amount = 132_000,
    paymentExpiresAt = LocalDateTime.of(2027, 1, 20, 19, 5),
  )

  companion object {
    private const val USER_ID = 1L
    private const val HOLD_ID = "hold-123"
    private val REQUEST_ID =
      UUID.fromString("2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a")
  }
}

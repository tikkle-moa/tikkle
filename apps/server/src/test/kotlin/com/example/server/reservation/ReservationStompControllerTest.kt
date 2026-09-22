package com.example.server.reservation

import com.example.server.auth.dto.LoginUserResult
import com.example.server.auth.types.UserRole
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.reservation.dto.BeginCheckoutReviewCommand
import com.example.server.reservation.dto.BeginCheckoutReviewData
import com.example.server.reservation.dto.BeginCheckoutReviewMessage
import com.example.server.reservation.dto.BeginCheckoutReviewMessageData
import com.example.server.reservation.dto.CancelCheckoutMessage
import com.example.server.reservation.dto.CancelCheckoutMessageData
import com.example.server.reservation.dto.CancelPaymentCommand
import com.example.server.reservation.dto.CancelPaymentData
import com.example.server.reservation.dto.ConfirmPaymentCommand
import com.example.server.reservation.dto.ConfirmPaymentData
import com.example.server.reservation.dto.ConfirmPaymentMessage
import com.example.server.reservation.dto.ConfirmPaymentMessageData
import com.example.server.reservation.dto.EndCheckoutReviewCommand
import com.example.server.reservation.dto.EndCheckoutReviewData
import com.example.server.reservation.dto.EndCheckoutReviewMessage
import com.example.server.reservation.dto.EndCheckoutReviewMessageData
import com.example.server.reservation.dto.GetPaymentOrderCommand
import com.example.server.reservation.dto.GetPaymentOrderData
import com.example.server.reservation.dto.PaymentOrderMessage
import com.example.server.reservation.dto.PaymentOrderMessageData
import com.example.server.reservation.dto.PaymentOrderSeatData
import com.example.server.reservation.dto.StartCheckoutCommand
import com.example.server.reservation.dto.StartCheckoutData
import com.example.server.reservation.dto.StartCheckoutMessage
import com.example.server.reservation.dto.StartCheckoutMessageData
import com.example.server.reservation.types.ReservationStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.Authentication
import java.time.LocalDateTime
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class ReservationStompControllerTest {
  @Mock
  lateinit var reservationCheckoutService: ReservationCheckoutService

  @Mock
  lateinit var reservationPaymentOrderService: ReservationPaymentOrderService

  @Mock
  lateinit var reservationPaymentService: ReservationPaymentService

  @InjectMocks
  lateinit var controller: ReservationStompController

  private val authentication: Authentication =
    UsernamePasswordAuthenticationToken(
      LoginUserResult(USER_ID, UserRole.USER),
      null,
    )

  @Test
  fun `예매 정보 확인 시작은 서버 snapshot을 개인 queue로 반환한다`() {
    val request = BeginCheckoutReviewCommand(REQUEST_ID, BeginCheckoutReviewData(PERFORMANCE_ID, REVIEW_TOKEN))
    val snapshot = BeginCheckoutReviewMessageData("1:10", PERFORMANCE_ID, listOf(101L), LocalDateTime.of(2027, 1, 20, 19, 5), REVIEW_TOKEN)
    given(reservationCheckoutService.beginCheckoutReview(USER_ID, PERFORMANCE_ID, REVIEW_TOKEN)).willReturn(snapshot)

    assertThat(controller.beginCheckoutReview(request, authentication)).isEqualTo(BeginCheckoutReviewMessage(REQUEST_ID, snapshot))
    assertEndpoint(
      methodName = "beginCheckoutReview",
      requestType = BeginCheckoutReviewCommand::class.java,
      messageMapping = "/reservation/begin-checkout-review",
      responseDestination = "/queue/reservation/begin-checkout-review",
    )
  }

  @Test
  fun `예매 정보 확인 종료는 token을 전달하고 개인 queue로 응답한다`() {
    val request = EndCheckoutReviewCommand(REQUEST_ID, EndCheckoutReviewData(PERFORMANCE_ID, REVIEW_TOKEN))

    assertThat(controller.endCheckoutReview(request, authentication))
      .isEqualTo(EndCheckoutReviewMessage(REQUEST_ID, EndCheckoutReviewMessageData(PERFORMANCE_ID)))
    then(reservationCheckoutService).should().endCheckoutReview(USER_ID, PERFORMANCE_ID, REVIEW_TOKEN)
    assertEndpoint(
      methodName = "endCheckoutReview",
      requestType = EndCheckoutReviewCommand::class.java,
      messageMapping = "/reservation/end-checkout-review",
      responseDestination = "/queue/reservation/end-checkout-review",
    )
  }

  @Nested
  @DisplayName("START_CHECKOUT")
  inner class StartCheckout {
    @Test
    fun `checkout 서비스에 위임하고 성공 메시지를 반환한다`() {
      val request = StartCheckoutCommand(
        requestId = REQUEST_ID,
        data = StartCheckoutData(PERFORMANCE_ID, REVIEW_TOKEN),
      )
      val result = startCheckoutMessageData()

      given(
        reservationCheckoutService.startCheckout(
          USER_ID,
          PERFORMANCE_ID,
          REVIEW_TOKEN,
        ),
      ).willReturn(result)

      val response = controller.startCheckout(
        request,
        authentication,
      )

      assertThat(response)
        .isEqualTo(StartCheckoutMessage(REQUEST_ID, result))

      then(reservationCheckoutService)
        .should()
        .startCheckout(USER_ID, PERFORMANCE_ID, REVIEW_TOKEN)
    }

    @Test
    fun `start-checkout destination과 개인 응답 queue를 사용한다`() {
      assertEndpoint(
        methodName = "startCheckout",
        requestType = StartCheckoutCommand::class.java,
        messageMapping = "/reservation/start-checkout",
        responseDestination = "/queue/reservation/start-checkout",
      )
    }
  }

  @Nested
  @DisplayName("GET_PAYMENT_ORDER")
  inner class GetPaymentOrder {
    @Test
    fun `결제 주문 조회 서비스에 위임하고 성공 메시지를 반환한다`() {
      val request = GetPaymentOrderCommand(
        requestId = REQUEST_ID,
        data = GetPaymentOrderData(RESERVATION_ID),
      )
      val result = paymentOrderMessageData()

      given(
        reservationPaymentOrderService.getPaymentOrder(
          USER_ID,
          RESERVATION_ID,
        ),
      ).willReturn(result)

      val response = controller.getPaymentOrder(
        request,
        authentication,
      )

      assertThat(response)
        .isEqualTo(PaymentOrderMessage(REQUEST_ID, result))

      then(reservationCheckoutService)
        .shouldHaveNoInteractions()

      then(reservationPaymentService)
        .shouldHaveNoInteractions()
    }

    @Test
    fun `get-payment-order destination과 개인 응답 queue를 사용한다`() {
      assertEndpoint(
        methodName = "getPaymentOrder",
        requestType = GetPaymentOrderCommand::class.java,
        messageMapping = "/reservation/get-payment-order",
        responseDestination = "/queue/reservation/get-payment-order",
      )
    }
  }

  @Nested
  @DisplayName("CONFIRM_PAYMENT")
  inner class ConfirmPayment {
    @Test
    fun `결제 승인 서비스에 위임하고 성공 메시지를 반환한다`() {
      val request = ConfirmPaymentCommand(
        requestId = REQUEST_ID,
        data = ConfirmPaymentData(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        ),
      )
      val result = ConfirmPaymentMessageData(
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

      val response = controller.confirmPayment(
        request,
        authentication,
      )

      assertThat(response)
        .isEqualTo(ConfirmPaymentMessage(REQUEST_ID, result))

      then(reservationCheckoutService)
        .shouldHaveNoInteractions()
    }

    @Test
    fun `인증 주체가 올바르지 않으면 UNAUTHORIZED 예외를 던진다`() {
      val request = ConfirmPaymentCommand(
        requestId = REQUEST_ID,
        data = ConfirmPaymentData(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        ),
      )
      val invalidAuthentication =
        UsernamePasswordAuthenticationToken("invalid", null)

      val exception = assertThrows<CustomException> {
        controller.confirmPayment(request, invalidAuthentication)
      }

      assertThat(exception.errorCode)
        .isEqualTo(ErrorCode.UNAUTHORIZED)
    }

    @Test
    fun `confirm-payment destination과 개인 응답 queue를 사용한다`() {
      assertEndpoint(
        methodName = "confirmPayment",
        requestType = ConfirmPaymentCommand::class.java,
        messageMapping = "/reservation/confirm-payment",
        responseDestination = "/queue/reservation/confirm-payment",
      )
    }
  }

  @Nested
  @DisplayName("CANCEL_PAYMENT")
  inner class CancelPayment {
    @Test
    fun `checkout 취소 서비스에 위임하고 성공 메시지를 반환한다`() {
      val request = CancelPaymentCommand(
        requestId = REQUEST_ID,
        data = CancelPaymentData(RESERVATION_ID),
      )
      val result = CancelCheckoutMessageData(
        reservationId = RESERVATION_ID,
        status = ReservationStatus.CANCELLED,
      )

      given(
        reservationCheckoutService.cancelCheckout(
          USER_ID,
          RESERVATION_ID,
        ),
      ).willReturn(result)

      val response = controller.cancelPayment(
        request,
        authentication,
      )

      assertThat(response)
        .isEqualTo(CancelCheckoutMessage(REQUEST_ID, result))

      then(reservationPaymentService)
        .shouldHaveNoInteractions()
    }

    @Test
    fun `cancel-payment destination과 개인 응답 queue를 사용한다`() {
      assertEndpoint(
        methodName = "cancelPayment",
        requestType = CancelPaymentCommand::class.java,
        messageMapping = "/reservation/cancel-payment",
        responseDestination = "/queue/reservation/cancel-payment",
      )
    }
  }

  private fun assertEndpoint(methodName: String, requestType: Class<*>, messageMapping: String, responseDestination: String) {
    val method = ReservationStompController::class.java.getDeclaredMethod(
      methodName,
      requestType,
      Authentication::class.java,
    )

    assertThat(method.getAnnotation(MessageMapping::class.java).value)
      .containsExactly(messageMapping)

    val sendToUser = requireNotNull(
      method.getAnnotation(SendToUser::class.java),
    )

    assertThat(sendToUser.value)
      .containsExactly(responseDestination)

    assertThat(sendToUser.broadcast)
      .isFalse()
  }

  private fun startCheckoutMessageData() = StartCheckoutMessageData(
    reservationId = RESERVATION_ID,
    orderId = ORDER_ID,
    orderName = "아이유 콘서트 1회차 2석",
    amount = AMOUNT,
    paymentExpiresAt = LocalDateTime.of(2027, 1, 20, 19, 5),
  )

  private fun paymentOrderMessageData() = PaymentOrderMessageData(
    reservationId = RESERVATION_ID,
    orderId = ORDER_ID,
    orderName = "아이유 콘서트 1회차 2석",
    amount = AMOUNT,
    paymentExpiresAt = LocalDateTime.of(2027, 1, 20, 19, 5),
    concertTitle = "아이유 콘서트",
    posterUrl = null,
    performanceName = "1회차",
    performanceStartsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
    venueName = "티클홀",
    seats = listOf(
      PaymentOrderSeatData(
        venueSeatId = 101L,
        sectionName = "R석",
        seatLabel = "A-1",
        price = 66_000,
      ),
    ),
  )

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L
    private const val RESERVATION_ID = 501L
    private const val PAYMENT_KEY = "payment-key"
    private const val ORDER_ID = "order-id"
    private const val AMOUNT = 132_000

    private val REQUEST_ID = UUID.fromString(
      "2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a",
    )
    private val REVIEW_TOKEN = UUID.fromString("25b619c1-f87a-4fbe-a2d7-2f16dc0cd1b3")
  }
}

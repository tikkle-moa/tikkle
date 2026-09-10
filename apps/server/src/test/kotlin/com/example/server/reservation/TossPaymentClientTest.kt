package com.example.server.reservation

import com.example.server.config.properties.TossPaymentsProperties
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.reservation.dto.ExternalPayment
import com.example.server.reservation.dto.ExternalPaymentStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withException
import org.springframework.test.web.client.response.MockRestResponseCreators.withServerError
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.web.client.RestClient
import java.io.IOException
import java.nio.charset.StandardCharsets
import java.util.Base64

@DisplayName("TossPaymentClient")
class TossPaymentClientTest {
  private lateinit var mockServer: MockRestServiceServer
  private lateinit var tossPaymentClient: TossPaymentClient

  @BeforeEach
  fun setUp() {
    val restClientBuilder = RestClient.builder()

    mockServer = MockRestServiceServer
      .bindTo(restClientBuilder)
      .build()

    tossPaymentClient = TossPaymentClient(
      restClientBuilder = restClientBuilder,
      properties = TossPaymentsProperties(
        baseUrl = BASE_URL,
        secretKey = SECRET_KEY,
      ),
    )
  }

  @Nested
  @DisplayName("confirm")
  inner class Confirm {
    @Test
    fun `Toss 승인 API 응답을 외부 결제 정보로 변환한다`() {
      mockServer.expect(method(HttpMethod.POST))
        .andExpect(requestTo("$BASE_URL/v1/payments/confirm"))
        .andExpect(
          header(
            HttpHeaders.AUTHORIZATION,
            "Basic ${encodedSecretKey()}",
          ),
        )
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(
          content().json(
            """
          {
            "paymentKey": "$PAYMENT_KEY",
            "orderId": "$ORDER_ID",
            "amount": $AMOUNT
          }
            """.trimIndent(),
          ),
        )
        .andRespond(
          org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(
            """
          {
            "paymentKey": "$PAYMENT_KEY",
            "orderId": "$ORDER_ID",
            "totalAmount": $AMOUNT,
            "status": "DONE"
          }
            """.trimIndent(),
            MediaType.APPLICATION_JSON,
          ),
        )

      val result = tossPaymentClient.confirm(
        paymentKey = PAYMENT_KEY,
        orderId = ORDER_ID,
        amount = AMOUNT,
      )

      assertThat(result).isEqualTo(
        ExternalPayment(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
          status = ExternalPaymentStatus.DONE,
        ),
      )
      mockServer.verify()
    }

    @Test
    fun `Toss 승인 응답이 비어 있으면 BAD_GATEWAY 예외를 던진다`() {
      mockServer.expect(method(HttpMethod.POST))
        .andRespond(
          org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(),
        )

      val exception = assertThrows<CustomException> {
        tossPaymentClient.confirm(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_GATEWAY)
      assertThat(exception.message).isEqualTo("결제 승인 응답이 비어 있습니다.")
      mockServer.verify()
    }

    @Test
    fun `Toss 승인 호출이 실패하면 BAD_GATEWAY 예외로 변환한다`() {
      mockServer.expect(method(HttpMethod.POST))
        .andRespond(withServerError())

      val exception = assertThrows<CustomException> {
        tossPaymentClient.confirm(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_GATEWAY)
      assertThat(exception.message).isEqualTo("결제 승인에 실패했습니다.")
      mockServer.verify()
    }
  }

  @Nested
  @DisplayName("cancel")
  inner class Cancel {
    @Test
    fun `Toss 취소 API에 Basic 인증과 취소 정보를 전송한다`() {
      mockServer.expect(method(HttpMethod.POST))
        .andExpect(requestTo("$BASE_URL/v1/payments/$PAYMENT_KEY/cancel"))
        .andExpect(
          header(
            HttpHeaders.AUTHORIZATION,
            "Basic ${encodedSecretKey()}",
          ),
        )
        .andExpect(header("Idempotency-Key", IDEMPOTENCY_KEY))
        .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
        .andExpect(
          content().json(
            """
            {
              "cancelReason": "$CANCEL_REASON"
            }
            """.trimIndent(),
          ),
        )
        .andRespond(
          org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(),
        )

      tossPaymentClient.cancel(
        paymentKey = PAYMENT_KEY,
        cancelReason = CANCEL_REASON,
        idempotencyKey = IDEMPOTENCY_KEY,
      )

      mockServer.verify()
    }

    @Test
    fun `Toss 취소 호출이 실패하면 BAD_GATEWAY 예외로 변환한다`() {
      mockServer.expect(method(HttpMethod.POST))
        .andRespond(withServerError())

      val exception = assertThrows<CustomException> {
        tossPaymentClient.cancel(
          paymentKey = PAYMENT_KEY,
          cancelReason = CANCEL_REASON,
          idempotencyKey = IDEMPOTENCY_KEY,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_GATEWAY)
      assertThat(exception.message).isEqualTo("결제 취소에 실패했습니다.")
      mockServer.verify()
    }
  }

  @Nested
  @DisplayName("find")
  inner class Find {
    @Test
    fun `Toss 결제 조회 API의 응답을 외부 결제 정보로 변환한다`() {
      mockServer.expect(method(HttpMethod.GET))
        .andExpect(requestTo("$BASE_URL/v1/payments/$PAYMENT_KEY"))
        .andExpect(
          header(
            HttpHeaders.AUTHORIZATION,
            "Basic ${encodedSecretKey()}",
          ),
        )
        .andRespond(
          org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(
            """
            {
              "paymentKey": "$PAYMENT_KEY",
              "orderId": "$ORDER_ID",
              "totalAmount": $AMOUNT,
              "status": "DONE"
            }
            """.trimIndent(),
            MediaType.APPLICATION_JSON,
          ),
        )

      val result = tossPaymentClient.find(PAYMENT_KEY)

      assertThat(result).isEqualTo(
        ExternalPayment(
          paymentKey = PAYMENT_KEY,
          orderId = ORDER_ID,
          amount = AMOUNT,
          status = ExternalPaymentStatus.DONE,
        ),
      )
      mockServer.verify()
    }

    @Test
    fun `Toss에 결제가 없으면 null을 반환한다`() {
      mockServer.expect(method(HttpMethod.GET))
        .andRespond(withStatus(HttpStatus.NOT_FOUND))

      val result = tossPaymentClient.find(PAYMENT_KEY)

      assertThat(result).isNull()
      mockServer.verify()
    }

    @Test
    fun `Toss 결제 조회 응답이 비어 있으면 BAD_GATEWAY 예외를 던진다`() {
      mockServer.expect(method(HttpMethod.GET))
        .andRespond(
          org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess(),
        )

      val exception = assertThrows<CustomException> {
        tossPaymentClient.find(PAYMENT_KEY)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_GATEWAY)
      assertThat(exception.message).isEqualTo("결제 조회 응답이 비어 있습니다.")
      mockServer.verify()
    }

    @Test
    fun `Toss 결제 조회가 HTTP 오류로 실패하면 BAD_GATEWAY 예외로 변환한다`() {
      mockServer.expect(method(HttpMethod.GET))
        .andRespond(withServerError())

      val exception = assertThrows<CustomException> {
        tossPaymentClient.find(PAYMENT_KEY)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_GATEWAY)
      assertThat(exception.message).isEqualTo("결제 조회에 실패했습니다.")
      mockServer.verify()
    }

    @Test
    fun `Toss 결제 조회 중 네트워크 오류가 발생하면 BAD_GATEWAY 예외로 변환한다`() {
      mockServer.expect(method(HttpMethod.GET))
        .andRespond(
          withException(IOException("connection reset")),
        )

      val exception = assertThrows<CustomException> {
        tossPaymentClient.find(PAYMENT_KEY)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_GATEWAY)
      assertThat(exception.message).isEqualTo("결제 조회에 실패했습니다.")
      mockServer.verify()
    }
  }

  private fun encodedSecretKey(): String = Base64.getEncoder().encodeToString(
    "$SECRET_KEY:".toByteArray(StandardCharsets.UTF_8),
  )

  private companion object {
    const val BASE_URL = "https://api.tosspayments.com"
    const val SECRET_KEY = "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"
    const val PAYMENT_KEY = "payment-key"
    const val ORDER_ID = "tikkle-order-123"
    const val AMOUNT = 132_000
    const val CANCEL_REASON = "로컬 예매 확정에 실패했습니다."
    const val IDEMPOTENCY_KEY = "payment-key-cancel"
  }
}

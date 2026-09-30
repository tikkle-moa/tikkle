package com.example.server.reservation.payment

import com.example.server.config.properties.TossPaymentsProperties
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestClientResponseException
import org.springframework.web.client.body

@Component
class TossPaymentClient(restClientBuilder: RestClient.Builder, private val properties: TossPaymentsProperties) : PaymentGateway {
  private val restClient = restClientBuilder
    .baseUrl(properties.baseUrl)
    .build()

  override fun confirm(paymentKey: String, orderId: String, amount: Int): ExternalPayment {
    try {
      val response = restClient.post()
        .uri("/v1/payments/confirm")
        .headers { headers ->
          headers.setBasicAuth(properties.secretKey, "")
        }
        .contentType(MediaType.APPLICATION_JSON)
        .body(
          TossPaymentConfirmRequest(
            paymentKey = paymentKey,
            orderId = orderId,
            amount = amount,
          ),
        )
        .retrieve()
        .body<TossPaymentResponse>()
        ?: throw CustomException(
          ErrorCode.BAD_GATEWAY,
          "결제 승인 응답이 비어 있습니다.",
        )

      return response.toPayment()
    } catch (_: RestClientException) {
      throw CustomException(
        ErrorCode.BAD_GATEWAY,
        "결제 승인에 실패했습니다.",
      )
    }
  }

  override fun cancel(paymentKey: String, cancelReason: String, idempotencyKey: String) {
    try {
      restClient.post()
        .uri("/v1/payments/{paymentKey}/cancel", paymentKey)
        .headers { headers ->
          headers.setBasicAuth(properties.secretKey, "")
          headers["Idempotency-Key"] = idempotencyKey
        }
        .contentType(MediaType.APPLICATION_JSON)
        .body(
          TossPaymentCancelRequest(
            cancelReason = cancelReason,
          ),
        )
        .retrieve()
        .toBodilessEntity()
    } catch (_: RestClientException) {
      throw CustomException(
        ErrorCode.BAD_GATEWAY,
        "결제 취소에 실패했습니다.",
      )
    }
  }

  override fun find(paymentKey: String): ExternalPayment? {
    try {
      val response = restClient.get()
        .uri("/v1/payments/{paymentKey}", paymentKey)
        .headers { headers ->
          headers.setBasicAuth(properties.secretKey, "")
        }
        .retrieve()
        .body<TossPaymentResponse>()
        ?: throw CustomException(
          ErrorCode.BAD_GATEWAY,
          "결제 조회 응답이 비어 있습니다.",
        )

      return response.toPayment()
    } catch (exception: RestClientResponseException) {
      if (exception.statusCode == HttpStatus.NOT_FOUND) {
        return null
      }

      throw CustomException(
        ErrorCode.BAD_GATEWAY,
        "결제 조회에 실패했습니다.",
      )
    } catch (_: RestClientException) {
      throw CustomException(
        ErrorCode.BAD_GATEWAY,
        "결제 조회에 실패했습니다.",
      )
    }
  }

  private data class TossPaymentResponse(val paymentKey: String, val orderId: String, val totalAmount: Int, val status: ExternalPaymentStatus)

  private fun TossPaymentResponse.toPayment() = ExternalPayment(
    paymentKey = paymentKey,
    orderId = orderId,
    amount = totalAmount,
    status = status,
  )
}

private data class TossPaymentConfirmRequest(val paymentKey: String, val orderId: String, val amount: Int)

private data class TossPaymentCancelRequest(val cancelReason: String)

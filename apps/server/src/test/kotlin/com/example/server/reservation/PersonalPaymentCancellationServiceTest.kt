package com.example.server.reservation

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Answers
import org.mockito.BDDMockito.given
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.StringRedisTemplate
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class PersonalPaymentCancellationServiceTest {
  @Mock lateinit var reservationRepository: ReservationRepository

  private lateinit var stringRedisTemplate: StringRedisTemplate
  private var executeResult: Long? = 0L
  private var preserveNullExecuteResult = false
  private var lastExecuteArguments: List<Any?> = emptyList()

  @Test
  fun `만료된 개인 결제 대기를 EXPIRED로 변경하고 Hold를 대체한다`() {
    val paymentPending = reservation(paymentExpiresAt = LocalDateTime.now().minusSeconds(1))
    given(
      reservationRepository.findPaymentInProgressByScopeForUpdate(
        null,
        USER_ID,
        PERFORMANCE_ID,
        listOf(ReservationStatus.PAYMENT_PENDING),
      ),
    ).willReturn(paymentPending)
    givenRedisExecution()

    service().cancelPersonalPaymentPending(SCOPE_ID, USER_ID, PERFORMANCE_ID)

    assertThat(paymentPending.status).isEqualTo(ReservationStatus.EXPIRED)
    assertThat(lastExecuteArguments.drop(1)).containsExactly(
      listOf("hold:scope:$SCOPE_ID", VERSION_KEY),
      "hold:detail:",
      SCOPE_ID,
      RESERVATION_ID.toString(),
    )
  }

  @Test
  fun `개인 결제 대기 Hold 대체 결과가 없으면 내부 오류를 반환한다`() {
    val paymentPending = reservation()
    given(
      reservationRepository.findPaymentInProgressByScopeForUpdate(
        null,
        USER_ID,
        PERFORMANCE_ID,
        listOf(ReservationStatus.PAYMENT_PENDING),
      ),
    ).willReturn(paymentPending)
    givenRedisExecution(result = null)

    val exception = assertThrows<CustomException> {
      service().cancelPersonalPaymentPending(SCOPE_ID, USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR)
  }

  @Test
  fun `그룹 scope에서는 개인 결제 대기를 취소하지 않는다`() {
    service().cancelPersonalPaymentPending("group:22", USER_ID, PERFORMANCE_ID)

    org.mockito.Mockito.verifyNoInteractions(reservationRepository)
  }

  private fun service(): PersonalPaymentCancellationService {
    if (!::stringRedisTemplate.isInitialized) {
      givenRedisExecution()
    }
    return PersonalPaymentCancellationService(reservationRepository, stringRedisTemplate)
  }

  private fun givenRedisExecution(result: Long? = executeResult) {
    executeResult = result
    preserveNullExecuteResult = result == null
    stringRedisTemplate = mock(
      StringRedisTemplate::class.java,
      org.mockito.stubbing.Answer { invocation ->
        if (invocation.method.name == "execute") {
          lastExecuteArguments = invocation.arguments.toList()
          if (executeResult == null && preserveNullExecuteResult) {
            null
          } else {
            executeResult
          }
        } else {
          Answers.RETURNS_DEFAULTS.answer(invocation)
        }
      },
    )
  }

  private fun reservation(paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5)) = Reservation(
    id = RESERVATION_ID,
    performance = mock(),
    booker = mock(),
    groupId = null,
    orderId = "order-$RESERVATION_ID",
    orderName = "테스트 예매",
    amount = 10_000,
    paymentExpiresAt = paymentExpiresAt,
  )

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L
    private const val SCOPE_ID = "personal:1:10"
    private const val VERSION_KEY = "performance:venue-seat-event-version:$PERFORMANCE_ID"
    private const val RESERVATION_ID = 501L
  }
}

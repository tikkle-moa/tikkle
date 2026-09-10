package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.RedisSeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.performance.entity.Performance
import com.example.server.reservation.dto.ConfirmPaymentResult
import com.example.server.reservation.dto.PaymentReconciliationTarget
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
@DisplayName("ReservationPaymentConfirmationService")
class ReservationPaymentConfirmationServiceTest {
  @Mock
  lateinit var reservationRepository: ReservationRepository

  @Mock
  lateinit var reservationSeatRepository: ReservationSeatRepository

  @Mock
  lateinit var venueSeatRepository: VenueSeatRepository

  @Mock
  lateinit var redisSeatHoldService: RedisSeatHoldService

  @InjectMocks
  lateinit var paymentConfirmationService: ReservationPaymentConfirmationService

  @Nested
  @DisplayName("begin")
  inner class Begin {
    @Test
    fun `유효한 결제 승인 시도를 PAYMENT_CONFIRMING으로 전이한다`() {
      val reservation = reservation()
      givenConfirmableReservation(reservation)

      val result = paymentConfirmationService.begin(
        userId = USER_ID,
        paymentKey = PAYMENT_KEY,
        orderId = ORDER_ID,
        amount = AMOUNT,
      )

      assertThat(result).isEqualTo(
        PaymentConfirmationStart.Ready(
          PaymentConfirmationAttempt(
            reservationId = RESERVATION_ID,
            paymentKey = PAYMENT_KEY,
          ),
        ),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.PAYMENT_CONFIRMING)
      assertThat(reservation.paymentAttemptKey).isEqualTo(PAYMENT_KEY)
      assertThat(reservation.paymentConfirmingAt).isNotNull()
    }

    @Test
    fun `예매가 없으면 NOT_FOUND를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(null)

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `예매 소유자가 아니면 FORBIDDEN을 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation(booker = user(OTHER_USER_ID)))

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `동일한 성공 결제 요청은 기존 결과를 반환한다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(
          reservation(
            status = ReservationStatus.SUCCEEDED,
            paymentKey = PAYMENT_KEY,
          ),
        )

      val result = paymentConfirmationService.begin(
        USER_ID,
        PAYMENT_KEY,
        ORDER_ID,
        AMOUNT,
      )

      assertThat(result).isEqualTo(
        PaymentConfirmationStart.AlreadySucceeded(
          ConfirmPaymentResult(
            reservationId = RESERVATION_ID,
            status = ReservationStatus.SUCCEEDED,
          ),
        ),
      )
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 승인 확인 중이면 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(
          reservation(status = ReservationStatus.PAYMENT_CONFIRMING),
        )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("결제 승인 결과를 확인하고 있습니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `환불 확인이 필요하면 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(
          reservation(status = ReservationStatus.REFUND_REQUIRED),
        )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("결제 취소 또는 환불 확인이 필요합니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @ParameterizedTest
    @EnumSource(
      value = ReservationStatus::class,
      names = ["FAILED", "CANCELLED", "EXPIRED", "REFUNDED"],
    )
    fun `종료된 예매는 CONFLICT를 던진다`(status: ReservationStatus) {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation(status = status))

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("이미 종료된 결제 요청입니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `금액이 다르면 BAD_REQUEST를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation())

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, 1)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
      assertThat(exception).hasMessage("결제 금액이 일치하지 않습니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 기한이 지났으면 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(
          reservation(
            paymentExpiresAt = LocalDateTime.now().minusMinutes(1),
          ),
        )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `활성 Hold가 없으면 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(null)

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
    }

    @Test
    fun `Hold 공연 회차가 다르면 좌석을 조회하지 않고 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID))
        .willReturn(hold(performanceId = OTHER_PERFORMANCE_ID))

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 예매된 좌석이 포함되면 CONFLICT를 던진다`() {
      givenConfirmableReservation(
        reservation = reservation(),
        seatsAlreadyReserved = true,
      )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("이미 예매된 좌석이 포함되어 있습니다.")
    }

    @Test
    fun `성공한 예매에 다른 결제 키가 오면 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(
          reservation(
            status = ReservationStatus.SUCCEEDED,
            paymentKey = PAYMENT_KEY,
          ),
        )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(
          USER_ID,
          "another-payment-key",
          ORDER_ID,
          AMOUNT,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("이미 종료된 결제입니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `성공한 예매에 다른 금액이 오면 CONFLICT를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(
          reservation(
            status = ReservationStatus.SUCCEEDED,
            paymentKey = PAYMENT_KEY,
          ),
        )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(
          USER_ID,
          PAYMENT_KEY,
          ORDER_ID,
          1,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("이미 종료된 결제입니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `Hold 소유자가 다르면 FORBIDDEN을 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID))
        .willReturn(hold(ownerUserId = OTHER_USER_ID))

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `Hold 좌석을 찾지 못하면 NOT_FOUND를 던진다`() {
      given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID))
        .willReturn(hold())
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = SEAT_IDS,
        ),
      ).willReturn(
        listOf(venueSeat(SEAT_IDS.first())),
      )

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.begin(USER_ID, PAYMENT_KEY, ORDER_ID, AMOUNT)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      assertThat(exception).hasMessage("공연장 좌석을 찾을 수 없습니다.")
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("complete")
  inner class Complete {
    @Test
    fun `로컬 확정에 성공하면 예매와 좌석을 확정한다`() {
      val reservation = reservation(
        status = ReservationStatus.PAYMENT_CONFIRMING,
        paymentAttemptKey = PAYMENT_KEY,
      )
      val hold = hold()
      var savedSeats: List<ReservationSeat> = emptyList()

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = SEAT_IDS,
        ),
      ).willReturn(venueSeats())
      given(
        reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(
          performanceId = PERFORMANCE_ID,
          venueSeatIds = SEAT_IDS,
        ),
      ).willReturn(false)
      given(reservationSeatRepository.saveAll(any<List<ReservationSeat>>()))
        .willAnswer { invocation ->
          invocation.getArgument<List<ReservationSeat>>(0)
            .also { savedSeats = it }
        }

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.Succeeded(
          result = ConfirmPaymentResult(
            reservationId = RESERVATION_ID,
            status = ReservationStatus.SUCCEEDED,
          ),
          hold = hold,
        ),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.SUCCEEDED)
      assertThat(reservation.paymentKey).isEqualTo(PAYMENT_KEY)
      assertThat(savedSeats.map { it.venueSeat.id })
        .containsExactlyElementsOf(SEAT_IDS)
      assertThat(savedSeats.map { it.reservation })
        .allSatisfy { assertThat(it).isSameAs(reservation) }
    }

    @Test
    fun `예매가 없으면 NOT_FOUND를 던진다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(null)

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.complete(attempt())
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 확정된 예매면 기존 성공 결과를 반환한다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(
          reservation(
            status = ReservationStatus.SUCCEEDED,
            paymentKey = PAYMENT_KEY,
          ),
        )

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.Succeeded(
          result = ConfirmPaymentResult(
            reservationId = RESERVATION_ID,
            status = ReservationStatus.SUCCEEDED,
          ),
          hold = null,
        ),
      )
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 환불 확인이 필요하면 환불 필요 결과를 반환한다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation(status = ReservationStatus.REFUND_REQUIRED))

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.RefundRequired(hold = null),
      )
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 승인 상태가 아닌 예매면 CONFLICT를 던진다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation(status = ReservationStatus.CANCELLED))

      val exception = assertThrows<CustomException> {
        paymentConfirmationService.complete(attempt())
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("결제 승인 상태가 아닙니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 승인 시도 키가 다르면 예외를 던진다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(
          reservation(
            status = ReservationStatus.PAYMENT_CONFIRMING,
            paymentAttemptKey = "another-payment-key",
          ),
        )

      val exception = assertThrows<IllegalStateException> {
        paymentConfirmationService.complete(attempt())
      }

      assertThat(exception).hasMessage("결제 승인 시도 키가 일치하지 않습니다.")
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `Hold가 사라졌으면 REFUND_REQUIRED로 전환한다`() {
      val reservation = confirmingReservation()

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(null)

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.RefundRequired(hold = null),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `Hold 공연 회차가 다르면 REFUND_REQUIRED로 전환한다`() {
      val reservation = confirmingReservation()
      val hold = hold(performanceId = OTHER_PERFORMANCE_ID)

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.RefundRequired(hold),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 기한이 지났으면 REFUND_REQUIRED로 전환한다`() {
      val reservation = confirmingReservation(
        paymentExpiresAt = LocalDateTime.now().minusMinutes(1),
      )
      val hold = hold()

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.RefundRequired(hold),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `Hold 좌석이 누락되면 REFUND_REQUIRED로 전환한다`() {
      val reservation = confirmingReservation()
      val hold = hold()

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = SEAT_IDS,
        ),
      ).willReturn(listOf(venueSeat(SEAT_IDS.first())))

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.RefundRequired(hold),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
      then(reservationSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 예매된 좌석이 있으면 REFUND_REQUIRED로 전환한다`() {
      val reservation = confirmingReservation()
      val hold = hold()

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = SEAT_IDS,
        ),
      ).willReturn(venueSeats())
      given(
        reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(
          performanceId = PERFORMANCE_ID,
          venueSeatIds = SEAT_IDS,
        ),
      ).willReturn(true)

      val result = paymentConfirmationService.complete(attempt())

      assertThat(result).isEqualTo(
        PaymentConfirmationCompletion.RefundRequired(hold),
      )
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
    }
  }

  @Nested
  @DisplayName("completeRefund")
  inner class CompleteRefund {
    @Test
    fun `환불이 완료되면 REFUNDED로 전이하고 활성 Hold를 반환한다`() {
      val reservation = reservation(
        status = ReservationStatus.REFUND_REQUIRED,
        paymentAttemptKey = PAYMENT_KEY,
      )
      val hold = hold()
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)

      val result = paymentConfirmationService.completeRefund(attempt())

      assertThat(result).isSameAs(hold)
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUNDED)
    }

    @Test
    fun `활성 Hold가 없어도 REFUNDED로 전이된다`() {
      val reservation = reservation(
        status = ReservationStatus.REFUND_REQUIRED,
        paymentAttemptKey = PAYMENT_KEY,
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(null)

      val result = paymentConfirmationService.completeRefund(attempt())

      assertThat(result).isNull()
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUNDED)
    }

    @Test
    fun `예매가 없으면 아무 작업도 하지 않는다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)

      val result = paymentConfirmationService.completeRefund(attempt())

      assertThat(result).isNull()
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `환불 대기 상태가 아니면 아무 작업도 하지 않는다`() {
      val reservation = reservation(
        status = ReservationStatus.PAYMENT_CONFIRMING,
        paymentAttemptKey = PAYMENT_KEY,
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

      val result = paymentConfirmationService.completeRefund(attempt())

      assertThat(result).isNull()
      assertThat(reservation.status).isEqualTo(ReservationStatus.PAYMENT_CONFIRMING)
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `승인 시도 키가 다르면 아무 작업도 하지 않는다`() {
      val reservation = reservation(
        status = ReservationStatus.REFUND_REQUIRED,
        paymentAttemptKey = "another-payment-key",
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

      val result = paymentConfirmationService.completeRefund(attempt())

      assertThat(result).isNull()
      assertThat(reservation.status).isEqualTo(ReservationStatus.REFUND_REQUIRED)
      then(redisSeatHoldService).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("reconciliation")
  inner class Reconciliation {
    @Nested
    @DisplayName("findReconciliationTarget")
    inner class FindReconciliationTarget {
      @ParameterizedTest
      @EnumSource(
        value = ReservationStatus::class,
        names = ["PAYMENT_CONFIRMING", "REFUND_REQUIRED"],
      )
      fun `대사 대상 상태면 결제 대사 정보를 반환한다`(status: ReservationStatus) {
        val reservation = reservation(
          status = status,
          paymentAttemptKey = PAYMENT_KEY,
        )
        given(reservationRepository.findById(RESERVATION_ID))
          .willReturn(Optional.of(reservation))

        val result = paymentConfirmationService.findReconciliationTarget(
          RESERVATION_ID,
        )

        assertThat(result).isEqualTo(
          PaymentReconciliationTarget(
            reservationId = RESERVATION_ID,
            status = status,
            paymentKey = PAYMENT_KEY,
            orderId = ORDER_ID,
            amount = AMOUNT,
          ),
        )
      }

      @Test
      fun `예매가 없으면 null을 반환한다`() {
        given(reservationRepository.findById(RESERVATION_ID))
          .willReturn(Optional.empty())

        val result = paymentConfirmationService.findReconciliationTarget(
          RESERVATION_ID,
        )

        assertThat(result).isNull()
      }

      @ParameterizedTest
      @EnumSource(
        value = ReservationStatus::class,
        names = [
          "PAYMENT_PENDING",
          "SUCCEEDED",
          "FAILED",
          "CANCELLED",
          "EXPIRED",
          "REFUNDED",
        ],
      )
      fun `대사 대상 상태가 아니면 null을 반환한다`(status: ReservationStatus) {
        given(reservationRepository.findById(RESERVATION_ID))
          .willReturn(Optional.of(reservation(status = status)))

        val result = paymentConfirmationService.findReconciliationTarget(
          RESERVATION_ID,
        )

        assertThat(result).isNull()
      }

      @Test
      fun `결제 승인 시도 키가 없으면 null을 반환한다`() {
        given(reservationRepository.findById(RESERVATION_ID))
          .willReturn(
            Optional.of(
              reservation(
                status = ReservationStatus.PAYMENT_CONFIRMING,
                paymentAttemptKey = null,
              ),
            ),
          )

        val result = paymentConfirmationService.findReconciliationTarget(
          RESERVATION_ID,
        )

        assertThat(result).isNull()
      }
    }

    @Nested
    @DisplayName("markPaymentFailed")
    inner class MarkPaymentFailed {
      @Test
      fun `결제 승인 중인 예매를 실패 상태로 변경하고 Hold를 반환한다`() {
        val reservation = reservation(
          status = ReservationStatus.PAYMENT_CONFIRMING,
          paymentAttemptKey = PAYMENT_KEY,
        )
        val hold = hold()

        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(reservation)
        given(redisSeatHoldService.findActive(HOLD_ID))
          .willReturn(hold)

        val result = paymentConfirmationService.markPaymentFailed(attempt())

        assertThat(result).isSameAs(hold)
        assertThat(reservation.status).isEqualTo(ReservationStatus.FAILED)
      }

      @Test
      fun `예매가 없으면 null을 반환한다`() {
        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(null)

        val result = paymentConfirmationService.markPaymentFailed(attempt())

        assertThat(result).isNull()
        then(redisSeatHoldService).shouldHaveNoInteractions()
      }

      @Test
      fun `결제 승인 중인 상태가 아니면 null을 반환한다`() {
        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(
            reservation(
              status = ReservationStatus.REFUND_REQUIRED,
              paymentAttemptKey = PAYMENT_KEY,
            ),
          )

        val result = paymentConfirmationService.markPaymentFailed(attempt())

        assertThat(result).isNull()
        then(redisSeatHoldService).shouldHaveNoInteractions()
      }

      @Test
      fun `결제 승인 시도 키가 다르면 null을 반환한다`() {
        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(
            reservation(
              status = ReservationStatus.PAYMENT_CONFIRMING,
              paymentAttemptKey = "another-payment-key",
            ),
          )

        val result = paymentConfirmationService.markPaymentFailed(attempt())

        assertThat(result).isNull()
        then(redisSeatHoldService).shouldHaveNoInteractions()
      }
    }

    @Nested
    @DisplayName("markRefundRequired")
    inner class MarkRefundRequired {
      @Test
      fun `승인 중인 예매를 환불 필요 상태로 전환한다`() {
        val reservation = reservation(
          status = ReservationStatus.PAYMENT_CONFIRMING,
          paymentAttemptKey = PAYMENT_KEY,
        )

        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(reservation)

        val result = paymentConfirmationService.markRefundRequired(attempt())

        assertThat(result).isTrue()
        assertThat(reservation.status)
          .isEqualTo(ReservationStatus.REFUND_REQUIRED)
      }

      @Test
      fun `이미 환불 필요 상태면 같은 승인 시도에 대해 true를 반환한다`() {
        val reservation = reservation(
          status = ReservationStatus.REFUND_REQUIRED,
          paymentAttemptKey = PAYMENT_KEY,
        )

        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(reservation)

        val result = paymentConfirmationService.markRefundRequired(attempt())

        assertThat(result).isTrue()
        assertThat(reservation.status)
          .isEqualTo(ReservationStatus.REFUND_REQUIRED)
      }

      @Test
      fun `승인 시도 키가 다르면 환불 필요 상태로 전환하지 않는다`() {
        val reservation = reservation(
          status = ReservationStatus.PAYMENT_CONFIRMING,
          paymentAttemptKey = "another-payment-key",
        )

        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(reservation)

        val result = paymentConfirmationService.markRefundRequired(attempt())

        assertThat(result).isFalse()
        assertThat(reservation.status)
          .isEqualTo(ReservationStatus.PAYMENT_CONFIRMING)
      }

      @Test
      fun `예매가 없으면 false를 반환한다`() {
        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(null)

        val result = paymentConfirmationService.markRefundRequired(attempt())

        assertThat(result).isFalse()
        then(redisSeatHoldService).shouldHaveNoInteractions()
      }

      @Test
      fun `승인 중인 상태가 아니면 false를 반환한다`() {
        val reservation = reservation(
          status = ReservationStatus.FAILED,
          paymentAttemptKey = PAYMENT_KEY,
        )

        given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
          .willReturn(reservation)

        val result = paymentConfirmationService.markRefundRequired(attempt())

        assertThat(result).isFalse()
        assertThat(reservation.status)
          .isEqualTo(ReservationStatus.FAILED)
        then(redisSeatHoldService).shouldHaveNoInteractions()
      }
    }
  }

  private fun givenConfirmableReservation(reservation: Reservation, hold: SeatHold = hold(), seatsAlreadyReserved: Boolean = false) {
    given(reservationRepository.findByOrderIdForUpdate(ORDER_ID))
      .willReturn(reservation)
    given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
    given(
      venueSeatRepository.findAllByVenueIdAndIdIn(
        venueId = VENUE_ID,
        venueSeatIds = SEAT_IDS,
      ),
    ).willReturn(venueSeats())
    given(
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(
        performanceId = PERFORMANCE_ID,
        venueSeatIds = SEAT_IDS,
      ),
    ).willReturn(seatsAlreadyReserved)
  }

  private fun reservation(
    status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,
    booker: User = user(),
    paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5),
    paymentAttemptKey: String? = null,
    paymentKey: String? = null,
  ) = Reservation(
    id = RESERVATION_ID,
    performance = performance(),
    booker = booker,
    holdId = HOLD_ID,
    orderId = ORDER_ID,
    orderName = "아이유 콘서트 1회차 2석",
    amount = AMOUNT,
    status = status,
    paymentExpiresAt = paymentExpiresAt,
    paymentAttemptKey = paymentAttemptKey,
    paymentKey = paymentKey,
  )

  private fun hold(ownerUserId: Long = USER_ID, performanceId: Long = PERFORMANCE_ID) = SeatHold(
    holdId = HOLD_ID,
    ownerUserId = ownerUserId,
    performanceId = performanceId,
    venueSeatIds = SEAT_IDS,
    expiresAt = LocalDateTime.now().plusMinutes(5),
  )

  private fun venueSeats(): List<VenueSeat> = SEAT_IDS.map(::venueSeat)

  private fun venueSeat(id: Long) = VenueSeat(
    id = id,
    venue = venue(),
    sectionName = "A",
    seatNumber = id.toInt(),
    seatLabel = "A-$id",
    price = 66_000,
    positionX = BigDecimal("10.00"),
    positionY = BigDecimal("10.00"),
  )

  private fun performance() = Performance(
    id = PERFORMANCE_ID,
    concert = Concert(
      id = 1L,
      venue = venue(),
      title = "아이유 콘서트",
      genre = ConcertGenre.BALLAD,
    ),
    name = "1회차",
    startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
  )

  private fun venue() = Venue(
    id = VENUE_ID,
    name = "올림픽 체조경기장",
    address = "서울",
    width = BigDecimal("100.00"),
    height = BigDecimal("100.00"),
    stagePositionX = BigDecimal("20.00"),
    stagePositionY = BigDecimal("5.00"),
    stageWidth = BigDecimal("40.00"),
    stageHeight = BigDecimal("10.00"),
  )

  private fun user(id: Long = USER_ID) = User(
    id = id,
    email = "user-$id@example.com",
    nickname = "사용자$id",
  )

  private fun confirmingReservation(paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5)) = reservation(
    status = ReservationStatus.PAYMENT_CONFIRMING,
    paymentAttemptKey = PAYMENT_KEY,
    paymentExpiresAt = paymentExpiresAt,
  )

  private fun attempt() = PaymentConfirmationAttempt(
    reservationId = RESERVATION_ID,
    paymentKey = PAYMENT_KEY,
  )

  private companion object {
    const val USER_ID = 1L
    const val OTHER_USER_ID = 2L
    const val PERFORMANCE_ID = 10L
    const val OTHER_PERFORMANCE_ID = 11L
    const val VENUE_ID = 20L
    const val RESERVATION_ID = 501L
    const val HOLD_ID = "hold-123"
    const val ORDER_ID = "tikkle-order-501"
    const val PAYMENT_KEY = "payment-key"
    const val AMOUNT = 132_000
    val SEAT_IDS = listOf(101L, 102L)
  }
}

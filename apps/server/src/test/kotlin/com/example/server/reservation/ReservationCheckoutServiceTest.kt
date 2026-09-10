package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.PerformanceSeatEventPublisher
import com.example.server.performance.SeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
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
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.ArgumentMatchers.anyLong
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class ReservationCheckoutServiceTest {
  @Mock
  lateinit var userRepository: UserRepository

  @Mock
  lateinit var performanceRepository: PerformanceRepository

  @Mock
  lateinit var venueSeatRepository: VenueSeatRepository

  @Mock
  lateinit var reservationRepository: ReservationRepository

  @Mock
  lateinit var seatHoldService: SeatHoldService

  @Mock
  lateinit var performanceSeatEventPublisher: PerformanceSeatEventPublisher

  @InjectMocks
  lateinit var reservationCheckoutService: ReservationCheckoutService

  @Nested
  @DisplayName("startCheckout")
  inner class StartCheckout {
    @Test
    fun `유효한 Hold로 PAYMENT_PENDING 예매를 생성한다`() {
      val hold = hold()
      val user = user()
      val performance = performance()
      val seats = listOf(
        venueSeat(id = 101L, price = 66_000),
        venueSeat(id = 102L, price = 66_000),
      )
      val savedReservation = reservation(
        id = RESERVATION_ID,
        performance = performance,
        booker = user,
        amount = 132_000,
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null, savedReservation)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = hold.venueSeatIds,
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
      givenPaymentPendingInsert(savedReservation)
      given(
        seatHoldService.extendForPayment(
          anyString(),
          anyLocalDateTime(),
        ),
      ).willReturn(hold)

      val result = reservationCheckoutService.startCheckout(
        userId = USER_ID,
        holdId = HOLD_ID,
      )

      assertThat(result.reservationId).isEqualTo(RESERVATION_ID)
      assertThat(result.amount).isEqualTo(132_000)
      assertThat(result.orderName).isEqualTo("아이유 콘서트 1회차 2석")
      assertThat(result.orderId).isEqualTo(savedReservation.orderId)
      assertThat(result.orderId).startsWith("tikkle-")
      assertThat(result.paymentExpiresAt)
        .isEqualTo(savedReservation.paymentExpiresAt)

      then(reservationRepository)
        .should()
        .insertPaymentPendingIfAbsent(
          performanceId = anyLong(),
          bookerUserId = anyLong(),
          holdId = anyString(),
          orderId = anyString(),
          orderName = anyString(),
          amount = anyInt(),
          paymentExpiresAt = anyLocalDateTime(),
        )
      then(seatHoldService)
        .should()
        .extendForPayment(
          anyString(),
          anyLocalDateTime(),
        )
    }

    @Test
    fun `예매 생성 후 재조회하지 못하면 예외를 던진다`() {
      val hold = hold()
      val user = user()
      val performance = performance()
      val seats = listOf(
        venueSeat(id = 101L, price = 66_000),
        venueSeat(id = 102L, price = 66_000),
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null, null)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = hold.venueSeatIds,
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
      givenPaymentPendingInsert(reservation())

      val exception = assertThrows<IllegalStateException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.message)
        .isEqualTo("생성한 결제 대기 예매를 찾을 수 없습니다.")
      then(seatHoldService)
        .should(never())
        .extendForPayment(
          anyString(),
          anyLocalDateTime(),
        )
    }

    @Test
    fun `같은 Hold로 다시 요청하면 기존 결제 대기 예매를 반환한다`() {
      val hold = hold()
      val user = user()
      val existingReservation = reservation(
        id = RESERVATION_ID,
        booker = user,
        status = ReservationStatus.PAYMENT_PENDING,
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(existingReservation)

      val result = reservationCheckoutService.startCheckout(
        userId = USER_ID,
        holdId = HOLD_ID,
      )

      assertThat(result.reservationId).isEqualTo(RESERVATION_ID)
      assertThat(result.orderId).isEqualTo(existingReservation.orderId)
      assertThat(result.amount).isEqualTo(existingReservation.amount)

      then(performanceRepository).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(userRepository).shouldHaveNoInteractions()
      then(seatHoldService).should().findActive(HOLD_ID)
      then(reservationRepository).should().findByHoldIdForUpdate(HOLD_ID)
      then(seatHoldService).shouldHaveNoMoreInteractions()
      then(reservationRepository).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `동시 요청이 먼저 생성한 예매를 반환하고 Hold를 다시 연장하지 않는다`() {
      val hold = hold()
      val user = user()
      val performance = performance()
      val seats = listOf(
        venueSeat(id = 101L, price = 66_000),
        venueSeat(id = 102L, price = 66_000),
      )
      val existingReservation = reservation(
        id = RESERVATION_ID,
        performance = performance,
        booker = user,
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null, existingReservation)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = hold.venueSeatIds,
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))

      val result = reservationCheckoutService.startCheckout(
        userId = USER_ID,
        holdId = HOLD_ID,
      )

      assertThat(result.reservationId).isEqualTo(RESERVATION_ID)
      assertThat(result.orderId).isEqualTo(existingReservation.orderId)
      then(seatHoldService)
        .should(never())
        .extendForPayment(
          anyString(),
          anyLocalDateTime(),
        )
    }

    @Test
    fun `기존 예매 소유자가 아니면 FORBIDDEN을 던진다`() {
      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(reservation(booker = user(OTHER_USER_ID)))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    }

    @Test
    fun `공연 회차가 없으면 NOT_FOUND를 던진다`() {
      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }

    @Test
    fun `Hold의 좌석이 공연장에 없으면 NOT_FOUND를 던진다`() {
      val performance = performance()

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          VENUE_ID,
          listOf(101L, 102L),
        ),
      ).willReturn(listOf(venueSeat(101L, 66_000)))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }

    @Test
    fun `사용자가 없으면 NOT_FOUND를 던진다`() {
      val performance = performance()
      val seats = listOf(
        venueSeat(101L, 66_000),
        venueSeat(102L, 66_000),
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          VENUE_ID,
          listOf(101L, 102L),
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.empty())

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }

    @Test
    fun `활성 Hold가 없으면 HOLD_EXPIRED를 던진다`() {
      given(seatHoldService.findActive(HOLD_ID)).willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(
          userId = USER_ID,
          holdId = HOLD_ID,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
      then(reservationRepository).shouldHaveNoInteractions()
      then(performanceRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `Hold 소유자가 아니면 FORBIDDEN을 던진다`() {
      given(seatHoldService.findActive(HOLD_ID))
        .willReturn(hold(ownerUserId = OTHER_USER_ID))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(
          userId = USER_ID,
          holdId = HOLD_ID,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
      then(reservationRepository).shouldHaveNoInteractions()
      then(performanceRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 대기 중이 아닌 기존 예매면 CONFLICT를 던진다`() {
      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(reservation(status = ReservationStatus.SUCCEEDED))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(
          userId = USER_ID,
          holdId = HOLD_ID,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(seatHoldService).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `결제용 Hold 연장에 실패하면 생성한 예매를 EXPIRED로 변경한다`() {
      val hold = hold().copy(venueSeatIds = listOf(101L))
      val insertedReservation = reservation()
      val user = user()
      val performance = performance()
      val seats = listOf(venueSeat(101L, 66_000))

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldIdForUpdate(HOLD_ID))
        .willReturn(null, insertedReservation)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = hold.venueSeatIds,
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
      givenPaymentPendingInsert(insertedReservation)
      given(
        seatHoldService.extendForPayment(
          anyString(),
          anyLocalDateTime(),
        ),
      ).willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
      assertThat(insertedReservation.status).isEqualTo(ReservationStatus.EXPIRED)
    }
  }

  @Nested
  @DisplayName("cancelCheckout")
  inner class CancelCheckout {
    @Test
    fun `결제 대기 예매를 CANCELLED로 변경하고 Hold를 해제한다`() {
      val reservation = reservation()
      val releasedHold = hold()

      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(seatHoldService.release(HOLD_ID)).willReturn(releasedHold)

      val result = reservationCheckoutService.cancelCheckout(
        userId = USER_ID,
        reservationId = RESERVATION_ID,
      )

      assertThat(result.reservationId).isEqualTo(RESERVATION_ID)
      assertThat(result.status).isEqualTo(ReservationStatus.CANCELLED)
      assertThat(reservation.status).isEqualTo(ReservationStatus.CANCELLED)
      then(seatHoldService).should().release(HOLD_ID)
      then(performanceSeatEventPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = listOf(101L, 102L),
        )
    }

    @Test
    fun `예매가 없으면 PAYMENT_NOT_FOUND를 던진다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      assertThat(exception).hasMessage("결제 대상 예매를 찾을 수 없습니다.")
      then(seatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `예매 소유자가 아니면 FORBIDDEN을 던진다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation(booker = user(OTHER_USER_ID)))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
      then(seatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `이미 성공한 예매면 PAYMENT_ALREADY_FINISHED를 던진다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation(status = ReservationStatus.SUCCEEDED))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("이미 종료된 결제입니다.")
      then(seatHoldService).shouldHaveNoInteractions()
    }

    @ParameterizedTest
    @EnumSource(
      value = ReservationStatus::class,
      names = ["FAILED", "CANCELLED", "EXPIRED"],
    )
    fun `이미 종료된 예매면 PAYMENT_ALREADY_CANCELLED를 던진다`(status: ReservationStatus) {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation(status = status))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      assertThat(exception).hasMessage("이미 종료된 결제 요청입니다.")
      then(seatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 기한이 지난 예매는 EXPIRED로 변경하고 Hold를 해제한다`() {
      val reservation = reservation(
        paymentExpiresAt = LocalDateTime.now().minusSeconds(1),
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)

      val result = reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)

      assertThat(result.status).isEqualTo(ReservationStatus.EXPIRED)
      assertThat(reservation.status).isEqualTo(ReservationStatus.EXPIRED)
      then(seatHoldService).should().release(HOLD_ID)
    }

    @Test
    fun `트랜잭션 커밋 후에만 Hold를 해제한다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation())
      given(seatHoldService.release(HOLD_ID)).willReturn(hold())

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)

        then(seatHoldService).should(never()).release(HOLD_ID)
        then(performanceSeatEventPublisher).shouldHaveNoInteractions()

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { it.afterCommit() }

        then(seatHoldService).should().release(HOLD_ID)
        then(performanceSeatEventPublisher)
          .should()
          .publishHoldReleased(
            performanceId = PERFORMANCE_ID,
            seatIds = listOf(101L, 102L),
          )
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `커밋 시점에 Hold가 이미 사라졌으면 좌석 해제 이벤트를 발행하지 않는다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation())
      given(seatHoldService.release(HOLD_ID)).willReturn(null)

      TransactionSynchronizationManager.initSynchronization()

      try {
        reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)

        TransactionSynchronizationManager
          .getSynchronizations()
          .forEach { it.afterCommit() }

        then(seatHoldService).should().release(HOLD_ID)
        then(performanceSeatEventPublisher).shouldHaveNoInteractions()
      } finally {
        TransactionSynchronizationManager.clearSynchronization()
      }
    }

    @Test
    fun `Hold가 이미 사라졌으면 좌석 해제 이벤트를 발행하지 않는다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation())
      given(seatHoldService.release(HOLD_ID)).willReturn(null)

      reservationCheckoutService.cancelCheckout(USER_ID, RESERVATION_ID)

      then(performanceSeatEventPublisher).shouldHaveNoInteractions()
    }
  }

  @Nested
  @DisplayName("expireCheckout")
  inner class ExpireCheckout {
    @Test
    fun `만료된 결제 대기 예매를 EXPIRED로 변경하고 Hold를 해제한다`() {
      val reservation = reservation(
        paymentExpiresAt = LocalDateTime.now().minusSeconds(1),
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)
      given(seatHoldService.release(HOLD_ID)).willReturn(hold())

      reservationCheckoutService.expireCheckout(RESERVATION_ID)

      assertThat(reservation.status).isEqualTo(ReservationStatus.EXPIRED)
      then(seatHoldService).should().release(HOLD_ID)
      then(performanceSeatEventPublisher)
        .should()
        .publishHoldReleased(
          performanceId = PERFORMANCE_ID,
          seatIds = listOf(101L, 102L),
        )
    }

    @Test
    fun `예매가 없으면 만료 처리를 건너뛴다`() {
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(null)

      reservationCheckoutService.expireCheckout(RESERVATION_ID)

      then(seatHoldService).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 기한이 남은 예매면 만료 처리를 건너뛴다`() {
      val reservation = reservation(
        paymentExpiresAt = LocalDateTime.now().plusMinutes(1),
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)

      reservationCheckoutService.expireCheckout(RESERVATION_ID)

      assertThat(reservation.status).isEqualTo(ReservationStatus.PAYMENT_PENDING)
      then(seatHoldService).shouldHaveNoInteractions()
    }

    @ParameterizedTest
    @EnumSource(
      value = ReservationStatus::class,
      names = ["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"],
    )
    fun `결제 대기 상태가 아닌 예매면 만료 처리를 건너뛴다`(status: ReservationStatus) {
      val reservation = reservation(
        status = status,
        paymentExpiresAt = LocalDateTime.now().minusMinutes(1),
      )
      given(reservationRepository.findByIdForUpdate(RESERVATION_ID))
        .willReturn(reservation)

      reservationCheckoutService.expireCheckout(RESERVATION_ID)

      assertThat(reservation.status).isEqualTo(status)
      then(seatHoldService).shouldHaveNoInteractions()
    }
  }

  private fun hold(ownerUserId: Long = USER_ID): SeatHold = SeatHold(
    holdId = HOLD_ID,
    ownerUserId = ownerUserId,
    performanceId = PERFORMANCE_ID,
    venueSeatIds = listOf(101L, 102L),
    expiresAt = LocalDateTime.now().plusMinutes(5),
  )

  private fun reservation(
    id: Long = RESERVATION_ID,
    performance: Performance = performance(),
    booker: User = user(),
    status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,
    amount: Int = 132_000,
    paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5),
  ): Reservation = Reservation(
    id = id,
    performance = performance,
    booker = booker,
    holdId = HOLD_ID,
    orderId = "tikkle-order-501",
    orderName = "아이유 콘서트 1회차 2석",
    amount = amount,
    status = status,
    paymentExpiresAt = paymentExpiresAt,
  )

  private fun performance(): Performance = Performance(
    id = PERFORMANCE_ID,
    concert = concert(),
    name = "1회차",
    startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
  )

  private fun concert(): Concert = Concert(
    id = 1L,
    venue = venue(),
    title = "아이유 콘서트",
    genre = ConcertGenre.BALLAD,
  )

  private fun venue(): Venue = Venue(
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

  private fun venueSeat(id: Long, price: Int): VenueSeat = VenueSeat(
    id = id,
    venue = venue(),
    sectionName = "A",
    seatNumber = id.toInt(),
    seatLabel = "A-$id",
    price = price,
    positionX = BigDecimal("10.00"),
    positionY = BigDecimal("10.00"),
  )

  private fun user(id: Long = USER_ID): User = User(
    id = id,
    email = "user-$id@example.com",
    nickname = "사용자$id",
  )

  private fun anyLocalDateTime(): LocalDateTime {
    any(LocalDateTime::class.java)
    return LocalDateTime.MIN
  }

  private fun givenPaymentPendingInsert(reservation: Reservation) {
    given(
      reservationRepository.insertPaymentPendingIfAbsent(
        performanceId = anyLong(),
        bookerUserId = anyLong(),
        holdId = anyString(),
        orderId = anyString(),
        orderName = anyString(),
        amount = anyInt(),
        paymentExpiresAt = anyLocalDateTime(),
      ),
    ).willAnswer { invocation ->
      reservation.orderId = invocation.getArgument(3)
      1
    }
  }

  companion object {
    private const val USER_ID = 1L
    private const val OTHER_USER_ID = 2L
    private const val PERFORMANCE_ID = 10L
    private const val VENUE_ID = 20L
    private const val HOLD_ID = "hold-123"
    private const val RESERVATION_ID = 501L
  }
}

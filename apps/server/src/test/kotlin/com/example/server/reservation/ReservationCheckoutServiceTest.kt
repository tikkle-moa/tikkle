package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.SeatHold
import com.example.server.performance.SeatHoldService
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
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.never
import org.mockito.junit.jupiter.MockitoExtension
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

  @InjectMocks
  lateinit var reservationCheckoutService: ReservationCheckoutService

  @Nested
  @DisplayName("startCheckout")
  inner class StartCheckout {
    @Test
    fun `유효한 Hold로 PAYMENT_PENDING 예약을 생성한다`() {
      val hold = hold()
      val user = user()
      val performance = performance()
      val seats = listOf(
        venueSeat(id = 101L, price = 66_000),
        venueSeat(id = 102L, price = 66_000),
      )
      val savedReservation = reservation(
        id = 501L,
        performance = performance,
        booker = user,
        amount = 132_000,
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldId(HOLD_ID)).willReturn(null)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = hold.venueSeatIds,
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
      given(
        seatHoldService.extendForPayment(
          anyString(),
          anyLocalDateTime(),
        ),
      ).willReturn(hold)
      given(reservationRepository.save(anyReservation()))
        .willReturn(savedReservation)

      val result = reservationCheckoutService.startCheckout(
        userId = USER_ID,
        holdId = HOLD_ID,
      )

      assertThat(result.reservationId).isEqualTo(501L)
      assertThat(result.amount).isEqualTo(132_000)
      assertThat(result.orderName).isEqualTo("아이유 콘서트 1회차 2석")
      assertThat(result.orderId).isEqualTo(savedReservation.orderId)
      assertThat(result.paymentExpiresAt)
        .isEqualTo(savedReservation.paymentExpiresAt)

      val captor = ArgumentCaptor.forClass(Reservation::class.java)

      then(reservationRepository)
        .should()
        .save(captor.capture())

      assertThat(captor.value.performance).isSameAs(performance)
      assertThat(captor.value.booker).isSameAs(user)
      assertThat(captor.value.holdId).isEqualTo(HOLD_ID)
      assertThat(captor.value.amount).isEqualTo(132_000)
      assertThat(captor.value.status)
        .isEqualTo(ReservationStatus.PAYMENT_PENDING)
      assertThat(captor.value.orderId).startsWith("tikkle-")
    }

    @Test
    fun `같은 Hold로 다시 요청하면 기존 결제 대기 예약을 반환한다`() {
      val hold = hold()
      val user = user()
      val existingReservation = reservation(
        id = 501L,
        booker = user,
        status = ReservationStatus.PAYMENT_PENDING,
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldId(HOLD_ID))
        .willReturn(existingReservation)

      val result = reservationCheckoutService.startCheckout(
        userId = USER_ID,
        holdId = HOLD_ID,
      )

      assertThat(result.reservationId).isEqualTo(501L)
      assertThat(result.orderId).isEqualTo(existingReservation.orderId)
      assertThat(result.amount).isEqualTo(existingReservation.amount)

      then(performanceRepository).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
      then(userRepository).shouldHaveNoInteractions()
      then(seatHoldService).should().findActive(HOLD_ID)
      then(reservationRepository).should().findByHoldId(HOLD_ID)

      then(seatHoldService).shouldHaveNoMoreInteractions()
      then(reservationRepository).shouldHaveNoMoreInteractions()
    }

    @Test
    fun `기존 예약 소유자가 아니면 FORBIDDEN을 던진다`() {
      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldId(HOLD_ID))
        .willReturn(reservation(booker = user(OTHER_USER_ID)))

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(USER_ID, HOLD_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    }

    @Test
    fun `공연 회차가 없으면 NOT_FOUND를 던진다`() {
      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold())
      given(reservationRepository.findByHoldId(HOLD_ID)).willReturn(null)
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
      given(reservationRepository.findByHoldId(HOLD_ID)).willReturn(null)
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
      given(reservationRepository.findByHoldId(HOLD_ID)).willReturn(null)
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

      assertThat(exception.errorCode).isEqualTo(ErrorCode.HOLD_EXPIRED)
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
    fun `결제 대기 중이 아닌 기존 예약이면 CONFLICT를 던진다`() {
      val hold = hold()
      val existingReservation = reservation(
        status = ReservationStatus.SUCCEEDED,
      )

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldId(HOLD_ID))
        .willReturn(existingReservation)

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
    fun `결제용 Hold 연장에 실패하면 예약을 저장하지 않는다`() {
      val hold = hold().copy(
        venueSeatIds = listOf(101L),
      )
      val user = user()
      val performance = performance()
      val seats = listOf(venueSeat(101L, 66_000))

      given(seatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(reservationRepository.findByHoldId(HOLD_ID)).willReturn(null)
      given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID))
        .willReturn(performance)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          venueId = VENUE_ID,
          venueSeatIds = hold.venueSeatIds,
        ),
      ).willReturn(seats)
      given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
      given(
        seatHoldService.extendForPayment(
          anyString(),
          anyLocalDateTime(),
        ),
      ).willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationCheckoutService.startCheckout(
          userId = USER_ID,
          holdId = HOLD_ID,
        )
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.HOLD_EXPIRED)
      then(reservationRepository)
        .should(never())
        .save(anyReservation())
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
    id: Long = 501L,
    performance: Performance = performance(),
    booker: User = user(),
    status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,
    amount: Int = 132_000,
  ): Reservation = Reservation(
    id = id,
    performance = performance,
    booker = booker,
    holdId = HOLD_ID,
    orderId = "tikkle-order-501",
    orderName = "아이유 콘서트 1회차 2석",
    amount = amount,
    status = status,
    paymentExpiresAt = LocalDateTime.now().plusMinutes(5),
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

  private fun anyReservation(): Reservation {
    any(Reservation::class.java)
    return reservation()
  }

  companion object {
    private const val USER_ID = 1L
    private const val OTHER_USER_ID = 2L
    private const val PERFORMANCE_ID = 10L
    private const val VENUE_ID = 20L
    private const val HOLD_ID = "hold-123"
  }
}

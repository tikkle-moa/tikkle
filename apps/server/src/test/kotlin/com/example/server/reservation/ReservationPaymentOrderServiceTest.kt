package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.RedisSeatHoldService
import com.example.server.performance.dto.SeatHold
import com.example.server.performance.entity.Performance
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
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.math.BigDecimal
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class ReservationPaymentOrderServiceTest {
  @Mock
  lateinit var reservationRepository: ReservationRepository

  @Mock
  lateinit var venueSeatRepository: VenueSeatRepository

  @Mock
  lateinit var redisSeatHoldService: RedisSeatHoldService

  @InjectMocks
  lateinit var reservationPaymentOrderService: ReservationPaymentOrderService

  @Nested
  @DisplayName("getPaymentOrder")
  inner class GetPaymentOrder {
    @Test
    fun `결제 대기 예매와 활성 Hold로 주문서를 좌석 선택 순서대로 반환한다`() {
      val reservation = reservation()
      val hold = hold(venueSeatIds = listOf(102L, 101L))
      val seats = listOf(
        venueSeat(id = 101L, sectionName = "R석", seatLabel = "A-1", price = 66_000),
        venueSeat(id = 102L, sectionName = "R석", seatLabel = "A-2", price = 66_000),
      )

      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation)
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(
          VENUE_ID,
          hold.venueSeatIds,
        ),
      ).willReturn(seats)

      val result = reservationPaymentOrderService.getPaymentOrder(
        userId = USER_ID,
        reservationId = RESERVATION_ID,
      )

      assertThat(result.reservationId).isEqualTo(RESERVATION_ID)
      assertThat(result.orderId).isEqualTo(ORDER_ID)
      assertThat(result.orderName).isEqualTo("아이유 콘서트 1회차 2석")
      assertThat(result.amount).isEqualTo(132_000)
      assertThat(result.concertTitle).isEqualTo("아이유 콘서트")
      assertThat(result.performanceName).isEqualTo("1회차")
      assertThat(result.venueName).isEqualTo("티클홀")
      assertThat(result.seats).extracting("venueSeatId").containsExactly(102L, 101L)
      assertThat(result.seats).extracting("seatLabel").containsExactly("A-2", "A-1")
    }

    @Test
    fun `예매가 없으면 NOT_FOUND를 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `예매 소유자가 아니면 FORBIDDEN을 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation(bookerUserId = OTHER_USER_ID))

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 대기가 아니면 CONFLICT를 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation(status = ReservationStatus.SUCCEEDED))

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `결제 가능 시간이 지나면 CONFLICT를 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation(paymentExpiresAt = LocalDateTime.now().minusSeconds(1)))

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(redisSeatHoldService).shouldHaveNoInteractions()
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `활성 Hold가 없으면 CONFLICT를 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(null)

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `예매와 다른 소유자 또는 공연 Hold면 CONFLICT를 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID))
        .willReturn(hold(ownerUserId = OTHER_USER_ID, performanceId = OTHER_PERFORMANCE_ID))

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `예매 소유자는 같지만 다른 공연의 Hold면 CONFLICT를 던진다`() {
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID))
        .willReturn(hold(performanceId = OTHER_PERFORMANCE_ID))

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
      then(venueSeatRepository).shouldHaveNoInteractions()
    }

    @Test
    fun `좌석이 하나인 주문서도 좌석 상세를 생성한다`() {
      val hold = hold(venueSeatIds = listOf(101L))
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, hold.venueSeatIds))
        .willReturn(listOf(venueSeat(id = 101L, sectionName = "R석", seatLabel = "A-1", price = 66_000)))

      val result = reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)

      assertThat(result.seats).hasSize(1)
      assertThat(result.seats.single().seatLabel).isEqualTo("A-1")
    }

    @Test
    fun `Hold 좌석을 모두 찾지 못하면 NOT_FOUND를 던진다`() {
      val hold = hold()
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, hold.venueSeatIds),
      ).willReturn(listOf(venueSeat(id = 101L, sectionName = "R석", seatLabel = "A-1", price = 66_000)))

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }

    @Test
    fun `조회된 좌석 개수는 같지만 요청한 좌석 ID가 없으면 NOT_FOUND를 던진다`() {
      val hold = hold()
      given(reservationRepository.findPaymentOrderById(RESERVATION_ID))
        .willReturn(reservation())
      given(redisSeatHoldService.findActive(HOLD_ID)).willReturn(hold)
      given(
        venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, hold.venueSeatIds),
      ).willReturn(
        listOf(
          venueSeat(id = 101L, sectionName = "R석", seatLabel = "A-1", price = 66_000),
          venueSeat(id = 999L, sectionName = "R석", seatLabel = "Z-9", price = 66_000),
        ),
      )

      val exception = assertThrows<CustomException> {
        reservationPaymentOrderService.getPaymentOrder(USER_ID, RESERVATION_ID)
      }

      assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    }
  }

  private fun reservation(
    bookerUserId: Long = USER_ID,
    status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,
    paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5),
  ): Reservation {
    val venue = Venue(
      id = VENUE_ID,
      name = "티클홀",
      address = "서울시",
      width = BigDecimal.ONE,
      height = BigDecimal.ONE,
      stagePositionX = BigDecimal.ZERO,
      stagePositionY = BigDecimal.ZERO,
      stageWidth = BigDecimal.ONE,
      stageHeight = BigDecimal.ONE,
    )
    val concert = Concert(
      id = CONCERT_ID,
      venue = venue,
      title = "아이유 콘서트",
      genre = ConcertGenre.BALLAD,
    )
    val performance = Performance(
      id = PERFORMANCE_ID,
      concert = concert,
      name = "1회차",
      startsAt = LocalDateTime.of(2027, 1, 20, 19, 0),
    )

    return Reservation(
      id = RESERVATION_ID,
      performance = performance,
      booker = User(
        id = bookerUserId,
        email = "user-$bookerUserId@example.com",
        nickname = "사용자$bookerUserId",
      ),
      holdId = HOLD_ID,
      orderId = ORDER_ID,
      orderName = "아이유 콘서트 1회차 2석",
      amount = 132_000,
      status = status,
      paymentExpiresAt = paymentExpiresAt,
    )
  }

  private fun hold(ownerUserId: Long = USER_ID, performanceId: Long = PERFORMANCE_ID, venueSeatIds: List<Long> = listOf(101L, 102L)) = SeatHold(
    holdId = HOLD_ID,
    ownerUserId = ownerUserId,
    performanceId = performanceId,
    venueSeatIds = venueSeatIds,
    expiresAt = LocalDateTime.now().plusMinutes(5),
  )

  private fun venueSeat(id: Long, sectionName: String, seatLabel: String, price: Int) = VenueSeat(
    id = id,
    venue = Venue(
      id = VENUE_ID,
      name = "티클홀",
      address = "서울시",
      width = BigDecimal.ONE,
      height = BigDecimal.ONE,
      stagePositionX = BigDecimal.ZERO,
      stagePositionY = BigDecimal.ZERO,
      stageWidth = BigDecimal.ONE,
      stageHeight = BigDecimal.ONE,
    ),
    sectionName = sectionName,
    seatNumber = id.toInt(),
    seatLabel = seatLabel,
    price = price,
    positionX = BigDecimal.ZERO,
    positionY = BigDecimal.ZERO,
  )

  companion object {
    private const val USER_ID = 1L
    private const val OTHER_USER_ID = 2L
    private const val RESERVATION_ID = 501L
    private const val HOLD_ID = "hold-123"
    private const val ORDER_ID = "tikkle-order-123"
    private const val PERFORMANCE_ID = 10L
    private const val OTHER_PERFORMANCE_ID = 20L
    private const val CONCERT_ID = 30L
    private const val VENUE_ID = 40L
  }
}

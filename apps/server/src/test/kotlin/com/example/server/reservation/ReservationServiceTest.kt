package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.entity.Performance
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import org.assertj.core.api.Assertions.assertThat
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
class ReservationServiceTest {
  @Mock lateinit var reservationRepository: ReservationRepository

  @Mock lateinit var reservationSeatRepository: ReservationSeatRepository

  @InjectMocks lateinit var service: ReservationService

  @Test
  fun `목록은 본인 예매와 공연 좌석 정보를 반환한다`() {
    val reservation = reservation()
    val seat = ReservationSeat(
      reservation = reservation,
      performance = reservation.performance,
      venueSeat = venueSeat(),
    )
    given(
      reservationRepository.findAllByBookerIdAndStatusNotOrderByCreatedAtDesc(
        USER_ID,
        ReservationStatus.PAYMENT_PENDING,
      ),
    ).willReturn(listOf(reservation))
    given(reservationSeatRepository.findAllDetailsByReservationIds(listOf(RESERVATION_ID))).willReturn(listOf(seat))

    val result = service.getMyReservations(USER_ID)

    assertThat(result).hasSize(1)
    val response = result.single()
    assertThat(response.id).isEqualTo(RESERVATION_ID)
    assertThat(response.concertTitle).isEqualTo("공연")
    assertThat(response.posterUrl).isEqualTo("https://example.com/poster.jpg")
    assertThat(response.performanceName).isEqualTo("1회차")
    assertThat(response.venueName).isEqualTo("공연장")
    assertThat(response.seats).containsExactly(com.example.server.reservation.dto.ReservationSeatResponse("A", "A-12"))
    assertThat(response.amount).isEqualTo(66_000)
    assertThat(response.status).isEqualTo(ReservationStatus.SUCCEEDED)
  }

  @Test
  fun `예매가 없으면 빈 목록을 반환한다`() {
    given(
      reservationRepository.findAllByBookerIdAndStatusNotOrderByCreatedAtDesc(
        USER_ID,
        ReservationStatus.PAYMENT_PENDING,
      ),
    ).willReturn(emptyList())

    assertThat(service.getMyReservations(USER_ID)).isEmpty()
    then(reservationSeatRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `좌석 상세가 없는 예매는 빈 좌석 목록을 반환한다`() {
    val reservation = reservation()
    given(
      reservationRepository.findAllByBookerIdAndStatusNotOrderByCreatedAtDesc(
        USER_ID,
        ReservationStatus.PAYMENT_PENDING,
      ),
    ).willReturn(listOf(reservation))
    given(reservationSeatRepository.findAllDetailsByReservationIds(listOf(RESERVATION_ID))).willReturn(emptyList())

    val result = service.getMyReservations(USER_ID)

    assertThat(result.single().seats).isEmpty()
  }

  @Test
  fun `예매 상세는 소유자 정보만 반환한다`() {
    val reservation = reservation()
    given(reservationRepository.findReservationDetailsById(RESERVATION_ID)).willReturn(reservation)
    given(reservationSeatRepository.findAllDetailsByReservationIds(listOf(RESERVATION_ID))).willReturn(emptyList())

    val result = service.getMyReservation(USER_ID, RESERVATION_ID)

    assertThat(result.id).isEqualTo(RESERVATION_ID)
    assertThat(result.seats).isEmpty()
  }

  @Test
  fun `없는 예매 상세는 NOT_FOUND를 반환한다`() {
    given(reservationRepository.findReservationDetailsById(RESERVATION_ID)).willReturn(null)

    val exception = assertThrows<CustomException> { service.getMyReservation(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `다른 사용자의 예매 상세는 FORBIDDEN을 반환한다`() {
    given(reservationRepository.findReservationDetailsById(RESERVATION_ID))
      .willReturn(reservation(booker = User(OTHER_USER_ID, "other@example.com", "다른 사용자")))

    val exception = assertThrows<CustomException> { service.getMyReservation(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
  }

  private fun reservation(booker: User = User(USER_ID, "user@example.com", "사용자")) = Reservation(
    id = RESERVATION_ID,
    performance = Performance(
      PERFORMANCE_ID,
      Concert(1L, venue(), "공연", ConcertGenre.BALLAD, posterUrl = "https://example.com/poster.jpg"),
      "1회차",
      LocalDateTime.of(2026, 12, 18, 19, 0),
    ),
    booker = booker,
    groupId = "1:10",
    orderId = "order-501",
    orderName = "공연 1회차 1석",
    amount = 66_000,
    status = ReservationStatus.SUCCEEDED,
    paymentExpiresAt = LocalDateTime.of(2026, 9, 30, 12, 0),
  )

  private fun venue() = Venue(
    id = VENUE_ID,
    name = "공연장",
    address = "서울",
    width = BigDecimal("100"),
    height = BigDecimal("100"),
    stagePositionX = BigDecimal("20"),
    stagePositionY = BigDecimal("5"),
    stageWidth = BigDecimal("40"),
    stageHeight = BigDecimal("10"),
  )

  private fun venueSeat() = VenueSeat(
    id = SEAT_ID,
    venue = venue(),
    sectionName = "A",
    seatNumber = 12,
    seatLabel = "A-12",
    price = 66_000,
    positionX = BigDecimal("10"),
    positionY = BigDecimal("10"),
  )

  private companion object {
    const val USER_ID = 1L
    const val OTHER_USER_ID = 2L
    const val PERFORMANCE_ID = 10L
    const val VENUE_ID = 20L
    const val RESERVATION_ID = 501L
    const val SEAT_ID = 101L
  }
}

package com.example.server.reservation

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.junit.jupiter.MockitoExtension
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class ReservationCheckoutExpirationSchedulerTest {
  @Mock
  lateinit var reservationRepository: ReservationRepository

  @Mock
  lateinit var reservationCheckoutService: ReservationCheckoutService

  @InjectMocks
  lateinit var scheduler: ReservationCheckoutExpirationScheduler

  @Test
  fun `만료된 결제 대기 예매가 없으면 만료 처리를 호출하지 않는다`() {
    given(
      reservationRepository.findAllByStatusAndPaymentExpiresAtBefore(
        anyReservationStatus(),
        anyLocalDateTime(),
      ),
    ).willReturn(emptyList())

    scheduler.expirePendingReservations()

    then(reservationCheckoutService).shouldHaveNoInteractions()
  }

  @Test
  fun `만료된 결제 대기 예매를 모두 만료 처리한다`() {
    val firstReservation = reservation(FIRST_RESERVATION_ID)
    val secondReservation = reservation(SECOND_RESERVATION_ID)

    given(
      reservationRepository.findAllByStatusAndPaymentExpiresAtBefore(
        anyReservationStatus(),
        anyLocalDateTime(),
      ),
    ).willReturn(
      listOf(firstReservation, secondReservation),
    )

    scheduler.expirePendingReservations()

    then(reservationCheckoutService)
      .should()
      .expireCheckout(FIRST_RESERVATION_ID)
    then(reservationCheckoutService)
      .should()
      .expireCheckout(SECOND_RESERVATION_ID)
  }

  private fun reservation(id: Long): Reservation = mock(Reservation::class.java).also {
    given(it.id).willReturn(id)
  }

  private fun anyReservationStatus(): ReservationStatus {
    any(ReservationStatus::class.java)
    return ReservationStatus.PAYMENT_PENDING
  }

  private fun anyLocalDateTime(): LocalDateTime {
    any(LocalDateTime::class.java)
    return LocalDateTime.MIN
  }

  companion object {
    private const val FIRST_RESERVATION_ID = 501L
    private const val SECOND_RESERVATION_ID = 502L
  }
}

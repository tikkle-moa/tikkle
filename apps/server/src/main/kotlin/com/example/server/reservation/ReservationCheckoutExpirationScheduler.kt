package com.example.server.reservation

import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDateTime

@Component
class ReservationCheckoutExpirationScheduler(
  private val reservationRepository: ReservationRepository,
  private val reservationCheckoutService: ReservationCheckoutService,
) {
  @Scheduled(fixedDelay = 60_000)
  fun expirePendingReservations() {
    val expiredReservations = reservationRepository
      .findAllByStatusAndPaymentExpiresAtBefore(
        status = ReservationStatus.PAYMENT_PENDING,
        paymentExpiresAt = LocalDateTime.now(),
      )

    expiredReservations.forEach { reservation ->
      reservationCheckoutService.expireCheckout(reservation.id)
    }
  }
}

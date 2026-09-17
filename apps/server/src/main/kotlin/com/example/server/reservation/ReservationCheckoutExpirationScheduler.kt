package com.example.server.reservation

import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDateTime

@Component
class ReservationCheckoutExpirationScheduler(
  private val reservationRepository: ReservationRepository,
  private val reservationCheckoutService: ReservationCheckoutService,
) {
  private val log = LoggerFactory.getLogger(ReservationCheckoutExpirationScheduler::class.java)

  @Scheduled(fixedDelay = 60_000)
  fun expirePendingReservations() {
    val expiredReservations = reservationRepository
      .findAllByStatusAndPaymentExpiresAtBefore(
        status = ReservationStatus.PAYMENT_PENDING,
        paymentExpiresAt = LocalDateTime.now(),
      )

    expiredReservations.forEach { reservation ->
      runCatching {
        reservationCheckoutService.expireCheckout(reservation.id)
      }.onFailure { exception ->
        log.error("결제 대기 예매 만료 처리에 실패했습니다. reservationId={}", reservation.id, exception)
      }
    }
  }
}

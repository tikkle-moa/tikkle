package com.example.server.reservation

import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.data.domain.PageRequest
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
@ConditionalOnProperty(
  prefix = "reservation.payment-reconciliation",
  name = ["enabled"],
  havingValue = "true",
  matchIfMissing = true,
)
class ReservationPaymentReconciliationScheduler(
  private val reservationRepository: ReservationRepository,
  private val reservationPaymentService: ReservationPaymentService,
) {
  private val log = LoggerFactory.getLogger(
    ReservationPaymentReconciliationScheduler::class.java,
  )

  private var cursorId = 0L

  @Scheduled(
    fixedDelayString = "\${reservation.payment-reconciliation.fixed-delay:60000}",
  )
  fun reconcilePaymentReservations() {
    val reservations = reservationRepository
      .findAllByStatusInAndIdGreaterThanOrderByIdAsc(
        statuses = RECONCILIATION_STATUSES,
        id = cursorId,
        pageable = PageRequest.of(0, BATCH_SIZE),
      )

    if (reservations.isEmpty()) {
      cursorId = 0L
      return
    }

    cursorId = reservations.last().id

    reservations.forEach { reservation ->
      runCatching {
        reservationPaymentService.reconcilePayment(reservation.id)
      }.onFailure { exception ->
        log.error(
          "결제 상태 대사에 실패했습니다. reservationId={}",
          reservation.id,
          exception,
        )
      }
    }
  }

  private companion object {
    const val BATCH_SIZE = 100

    val RECONCILIATION_STATUSES = setOf(
      ReservationStatus.PAYMENT_CONFIRMING,
      ReservationStatus.REFUND_REQUIRED,
    )
  }
}

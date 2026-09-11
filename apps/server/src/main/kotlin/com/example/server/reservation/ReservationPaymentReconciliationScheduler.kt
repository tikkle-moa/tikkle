package com.example.server.reservation

import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.data.domain.Limit
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
        limit = Limit.of(BATCH_SIZE),
      )

    if (reservations.isEmpty()) {
      cursorId = 0L
      return
    }

    var hasFailure = false
    var lastSuccessfulId = cursorId

    reservations.forEach { reservation ->
      runCatching {
        reservationPaymentService.reconcilePayment(reservation.id)
      }.onFailure { exception ->
        hasFailure = true
        log.error(
          "결제 상태 대사에 실패했습니다. reservationId={}",
          reservation.id,
          exception,
        )
      }.onSuccess {
        if (!hasFailure) {
          lastSuccessfulId = reservation.id
        }
      }
    }

    // 조회 조건이 `id > cursorId`이므로 실패 이전의 마지막 성공 ID를 유지해 실패 건을 재처리한다.
    cursorId = if (hasFailure) lastSuccessfulId else reservations.last().id
  }

  private companion object {
    const val BATCH_SIZE = 100

    val RECONCILIATION_STATUSES = setOf(
      ReservationStatus.PAYMENT_CONFIRMING,
      ReservationStatus.REFUND_REQUIRED,
    )
  }
}

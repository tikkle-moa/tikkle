package com.example.server.reservation

import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.anyLong
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willAnswer
import org.mockito.BDDMockito.willThrow
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.domain.Limit

@ExtendWith(MockitoExtension::class)
class ReservationPaymentReconciliationSchedulerTest {
  @Mock
  lateinit var reservationRepository: ReservationRepository

  @Mock
  lateinit var reservationPaymentService: ReservationPaymentService

  @InjectMocks
  lateinit var scheduler: ReservationPaymentReconciliationScheduler

  @Test
  fun `대사 대상 예매가 없으면 결제 상태 대사를 호출하지 않는다`() {
    givenReconciliationTargets()

    scheduler.reconcilePaymentReservations()

    then(reservationPaymentService).shouldHaveNoInteractions()
  }

  @Test
  fun `PAYMENT_CONFIRMING과 REFUND_REQUIRED 예매를 대사한다`() {
    val firstReservation = reservation(FIRST_RESERVATION_ID)
    val secondReservation = reservation(SECOND_RESERVATION_ID)

    givenReconciliationTargets(
      reservations = listOf(firstReservation, secondReservation),
    )

    scheduler.reconcilePaymentReservations()

    then(reservationPaymentService)
      .should()
      .reconcilePayment(FIRST_RESERVATION_ID)
    then(reservationPaymentService)
      .should()
      .reconcilePayment(SECOND_RESERVATION_ID)
  }

  @Test
  fun `한 예매의 대사에 실패해도 다음 예매를 계속 처리한다`() {
    val firstReservation = reservation(FIRST_RESERVATION_ID)
    val secondReservation = reservation(SECOND_RESERVATION_ID)

    givenReconciliationTargets(
      reservations = listOf(firstReservation, secondReservation),
    )

    willThrow(IllegalStateException("일시적인 오류"))
      .given(reservationPaymentService)
      .reconcilePayment(FIRST_RESERVATION_ID)

    scheduler.reconcilePaymentReservations()

    then(reservationPaymentService)
      .should()
      .reconcilePayment(FIRST_RESERVATION_ID)
    then(reservationPaymentService)
      .should()
      .reconcilePayment(SECOND_RESERVATION_ID)
  }

  @Test
  fun `대사 실패가 발생하면 다음 실행에서 실패 예매부터 다시 조회한다`() {
    val firstReservation = reservation(FIRST_RESERVATION_ID)
    val failedReservation = reservation(SECOND_RESERVATION_ID)
    val laterReservation = reservation(SECOND_RESERVATION_ID + 1)

    givenReconciliationTargets(
      reservations = listOf(firstReservation, failedReservation, laterReservation),
    )

    willAnswer { invocation ->
      if (invocation.getArgument<Long>(0) == SECOND_RESERVATION_ID) {
        throw IllegalStateException("일시적인 오류")
      }
    }.given(reservationPaymentService)
      .reconcilePayment(anyLong())

    scheduler.reconcilePaymentReservations()
    scheduler.reconcilePaymentReservations()

    then(reservationRepository).should()
      .findAllByStatusInAndIdGreaterThanOrderByIdAsc(
        statuses = setOf(
          ReservationStatus.PAYMENT_CONFIRMING,
          ReservationStatus.REFUND_REQUIRED,
        ),
        id = FIRST_RESERVATION_ID,
        limit = Limit.of(BATCH_SIZE),
      )
  }

  @Test
  fun `다음 실행에서 이전 배치 다음의 예매를 대사한다`() {
    val firstBatch = (1..BATCH_SIZE)
      .map { reservation(it.toLong()) }
    val nextReservation = reservation(NEXT_RESERVATION_ID)

    givenReconciliationTargets(
      cursorId = 0L,
      reservations = firstBatch,
    )
    givenReconciliationTargets(
      cursorId = BATCH_SIZE.toLong(),
      reservations = listOf(nextReservation),
    )

    scheduler.reconcilePaymentReservations()
    scheduler.reconcilePaymentReservations()

    then(reservationPaymentService)
      .should()
      .reconcilePayment(NEXT_RESERVATION_ID)
  }

  private fun givenReconciliationTargets(cursorId: Long = 0L, reservations: List<Reservation> = emptyList()) {
    given(
      reservationRepository.findAllByStatusInAndIdGreaterThanOrderByIdAsc(
        statuses = setOf(
          ReservationStatus.PAYMENT_CONFIRMING,
          ReservationStatus.REFUND_REQUIRED,
        ),
        id = cursorId,
        limit = Limit.of(BATCH_SIZE),
      ),
    ).willReturn(reservations)
  }

  private fun reservation(id: Long): Reservation = mock(Reservation::class.java).also {
    given(it.id).willReturn(id)
  }

  companion object {
    private const val BATCH_SIZE = 100
    private const val FIRST_RESERVATION_ID = 501L
    private const val SECOND_RESERVATION_ID = 502L
    private const val NEXT_RESERVATION_ID = 1001L
  }
}

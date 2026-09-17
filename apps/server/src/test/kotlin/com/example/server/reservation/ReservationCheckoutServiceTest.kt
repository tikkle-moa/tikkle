package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.OutboxEventService
import com.example.server.performance.RedisVenueSeatHoldService
import com.example.server.performance.dto.ActiveHoldData
import com.example.server.performance.dto.HoldVenueSeatEntry
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.support.anyNonNull
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.BDDMockito.willThrow
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.Optional

@ExtendWith(MockitoExtension::class)
class ReservationCheckoutServiceTest {
  @Mock lateinit var userRepository: UserRepository

  @Mock lateinit var performanceRepository: PerformanceRepository

  @Mock lateinit var venueSeatRepository: VenueSeatRepository

  @Mock lateinit var reservationRepository: ReservationRepository

  @Mock lateinit var redisVenueSeatHoldService: RedisVenueSeatHoldService

  @Mock lateinit var outboxEventService: OutboxEventService

  @InjectMocks lateinit var service: ReservationCheckoutService

  @Test
  fun `여러 Hold detail의 좌석을 합산해 결제 대기 예매를 생성하고 결제용으로 전환한다`() {
    val user = user()
    val performance = performance()
    val seats = listOf(venueSeat(101, 66_000), venueSeat(102, 70_000), venueSeat(103, 72_000))
    val created = reservation(performance = performance, booker = user, amount = 208_000)
    val active = activeHoldData(
      holds = listOf(
        hold("hold-1", listOf(101L, 102L)),
        hold("hold-2", listOf(103L)),
      ),
    )
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null, created)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L, 103L))).willReturn(seats)
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    org.mockito.BDDMockito.willAnswer { invocation ->
      created.orderId = invocation.getArgument(3)
      created.orderName = invocation.getArgument(4)
      created.amount = invocation.getArgument(5)
      created.paymentExpiresAt = invocation.getArgument(6)
      1
    }.given(reservationRepository).insertPaymentPendingIfAbsent(
      performanceId = org.mockito.ArgumentMatchers.anyLong(),
      bookerUserId = org.mockito.ArgumentMatchers.anyLong(),
      groupId = org.mockito.ArgumentMatchers.anyString(),
      orderId = org.mockito.ArgumentMatchers.anyString(),
      orderName = org.mockito.ArgumentMatchers.anyString(),
      amount = org.mockito.ArgumentMatchers.anyInt(),
      paymentExpiresAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
    )
    given(redisVenueSeatHoldService.transitionForPayment(eqGroupId(), anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN)))
      .willReturn(active.holdDetails)

    val result = service.startCheckout(USER_ID, PERFORMANCE_ID)

    assertThat(result.reservationId).isEqualTo(created.id)
    assertThat(result.amount).isEqualTo(208_000)
    assertThat(result.orderName).isEqualTo("아이유 콘서트 1회차 3석")
    assertThat(result.orderId).startsWith("tikkle-")
    then(reservationRepository).should().insertPaymentPendingIfAbsent(
      performanceId = org.mockito.ArgumentMatchers.anyLong(),
      bookerUserId = org.mockito.ArgumentMatchers.anyLong(),
      groupId = org.mockito.ArgumentMatchers.anyString(),
      orderId = org.mockito.ArgumentMatchers.anyString(),
      orderName = org.mockito.ArgumentMatchers.anyString(),
      amount = org.mockito.ArgumentMatchers.anyInt(),
      paymentExpiresAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
    )
    then(redisVenueSeatHoldService).should().transitionForPayment(eqGroupId(), anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN))
  }

  @Test
  fun `활성 Hold가 없으면 만료 충돌로 변환한다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willThrow(CustomException(ErrorCode.NOT_FOUND, "점유된 좌석이 존재하지 않습니다."))

    val exception = assertThrows<CustomException> { service.startCheckout(USER_ID, PERFORMANCE_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    assertThat(exception).hasMessage("좌석 점유가 만료되었습니다.")
    then(reservationRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `같은 Hold 그룹의 결제 대기 예매가 있으면 기존 예매를 반환한다`() {
    val existing = reservation()
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(existing)

    val result = service.startCheckout(USER_ID, PERFORMANCE_ID)

    assertThat(result.reservationId).isEqualTo(existing.id)
    then(performanceRepository).shouldHaveNoInteractions()
    then(redisVenueSeatHoldService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `공연장 좌석 수가 Hold와 다르면 NOT_FOUND를 반환한다`() {
    val performance = performance()
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L))).willReturn(listOf(venueSeat(101, 66_000)))

    val exception = assertThrows<CustomException> { service.startCheckout(USER_ID, PERFORMANCE_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
    then(userRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `결제 전환 충돌 시 생성한 예매를 만료 처리한다`() {
    val user = user()
    val performance = performance()
    val created = reservation(performance = performance, booker = user)
    val active = activeHoldData()
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null, created)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(
      venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)),
    ).willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    org.mockito.BDDMockito.willAnswer { invocation ->
      created.orderId = invocation.getArgument(3)
      created.orderName = invocation.getArgument(4)
      created.amount = invocation.getArgument(5)
      created.paymentExpiresAt = invocation.getArgument(6)
      1
    }.given(reservationRepository).insertPaymentPendingIfAbsent(
      performanceId = org.mockito.ArgumentMatchers.anyLong(),
      bookerUserId = org.mockito.ArgumentMatchers.anyLong(),
      groupId = org.mockito.ArgumentMatchers.anyString(),
      orderId = org.mockito.ArgumentMatchers.anyString(),
      orderName = org.mockito.ArgumentMatchers.anyString(),
      amount = org.mockito.ArgumentMatchers.anyInt(),
      paymentExpiresAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
    )
    given(redisVenueSeatHoldService.transitionForPayment(eqGroupId(), anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN)))
      .willThrow(CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 결제 전환을 할 수 없습니다."))

    val exception = assertThrows<CustomException> { service.startCheckout(USER_ID, PERFORMANCE_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    assertThat(created.status).isEqualTo(ReservationStatus.EXPIRED)
  }

  @Test
  fun `결제 대기 예매를 취소하면 Hold별 Outbox 이벤트를 기록한다`() {
    val reservation = reservation()
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.cancelCheckout(USER_ID, RESERVATION_ID)

    assertThat(result.status).isEqualTo(ReservationStatus.CANCELLED)
    then(outboxEventService).should().recordHoldReleased(RESERVATION_ID, active.holdDetails.single())
  }

  @Test
  fun `다른 사용자의 예매 취소는 거부한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation(booker = user(OTHER_USER_ID)))

    val exception = assertThrows<CustomException> { service.cancelCheckout(USER_ID, RESERVATION_ID) }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `만료된 결제 대기 예매는 EXPIRED로 바꾸고 Hold를 해제한다`() {
    val reservation = reservation(paymentExpiresAt = LocalDateTime.now().minusSeconds(1))
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    service.expireCheckout(RESERVATION_ID)

    assertThat(reservation.status).isEqualTo(ReservationStatus.EXPIRED)
    then(outboxEventService).should().recordHoldReleased(RESERVATION_ID, active.holdDetails.single())
  }

  @Test
  fun `Hold 조회에서 NOT_FOUND가 아닌 예외는 그대로 전파한다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    val exception = CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "redis failed")
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willThrow(exception)

    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      },
    ).isSameAs(exception)
  }

  @Test
  fun `Hold 공연 회차가 다르면 결제 대기를 생성하지 않는다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willReturn(activeHoldData(performanceId = OTHER_PERFORMANCE_ID))

    val exception = assertThrows<CustomException> {
      service.startCheckout(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(performanceRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `Hold detail의 그룹이나 공연 회차가 다르면 결제 대기를 생성하지 않는다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    val invalidGroup = activeHoldData(holds = listOf(hold("hold-1", listOf(101L, 102L)).copy(groupId = "other")))
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(invalidGroup)
    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)

    val invalidPerformance = activeHoldData(holds = listOf(hold("hold-1", listOf(101L, 102L)).copy(performanceId = OTHER_PERFORMANCE_ID)))
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(invalidPerformance)
    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `중복된 Hold 좌석이면 결제 대기를 생성하지 않는다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    val active = activeHoldData(entries = listOf(101L, 101L))
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `공연 회차를 찾지 못하면 결제 대기를 생성하지 않는다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(null)

    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `사용자를 찾지 못하면 결제 대기를 생성하지 않는다`() {
    val performance = performance()
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(userRepository.findById(USER_ID)).willReturn(Optional.empty())

    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `동시 생성 후 다른 주문이 조회되면 기존 결제 대기를 반환한다`() {
    val performance = performance()
    val user = user()
    val existing = reservation(orderId = "another-order", performance = performance, booker = user)
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null, existing)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))

    val result = service.startCheckout(USER_ID, PERFORMANCE_ID)

    assertThat(result.orderId).isEqualTo("another-order")
    then(redisVenueSeatHoldService).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `생성한 결제 대기 예매를 재조회하지 못하면 예외를 던진다`() {
    val performance = performance()
    val user = user()
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null, null)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    given(
      reservationRepository.insertPaymentPendingIfAbsent(
        performanceId = org.mockito.ArgumentMatchers.anyLong(),
        bookerUserId = org.mockito.ArgumentMatchers.anyLong(),
        groupId = org.mockito.ArgumentMatchers.anyString(),
        orderId = org.mockito.ArgumentMatchers.anyString(),
        orderName = org.mockito.ArgumentMatchers.anyString(),
        amount = org.mockito.ArgumentMatchers.anyInt(),
        paymentExpiresAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      ),
    ).willReturn(1)

    assertThat(
      assertThrows<IllegalStateException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      },
    ).hasMessage("생성한 결제 대기 예매를 찾을 수 없습니다.")
  }

  @Test
  fun `결제 전환에서 NOT_FOUND가 발생하면 예매를 만료 처리한다`() {
    val performance = performance()
    val user = user()
    val created = reservation(performance = performance, booker = user)
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null, created)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    given(
      reservationRepository.insertPaymentPendingIfAbsent(
        performanceId = org.mockito.ArgumentMatchers.anyLong(),
        bookerUserId = org.mockito.ArgumentMatchers.anyLong(),
        groupId = org.mockito.ArgumentMatchers.anyString(),
        orderId = org.mockito.ArgumentMatchers.anyString(),
        orderName = org.mockito.ArgumentMatchers.anyString(),
        amount = org.mockito.ArgumentMatchers.anyInt(),
        paymentExpiresAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      ),
    ).willAnswer { invocation ->
      created.orderId = invocation.getArgument(3)
      1
    }
    given(redisVenueSeatHoldService.transitionForPayment(eqGroupId(), anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN)))
      .willThrow(CustomException(ErrorCode.NOT_FOUND, "expired"))

    val exception = assertThrows<CustomException> {
      service.startCheckout(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    assertThat(created.status).isEqualTo(ReservationStatus.EXPIRED)
  }

  @Test
  fun `결제 전환의 일반 충돌은 예매를 만료 처리하고 그대로 전파한다`() {
    val performance = performance()
    val user = user()
    val created = reservation(performance = performance, booker = user)
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(null, created)
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance)
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101, 66_000), venueSeat(102, 66_000)))
    given(userRepository.findById(USER_ID)).willReturn(Optional.of(user))
    given(
      reservationRepository.insertPaymentPendingIfAbsent(
        performanceId = org.mockito.ArgumentMatchers.anyLong(),
        bookerUserId = org.mockito.ArgumentMatchers.anyLong(),
        groupId = org.mockito.ArgumentMatchers.anyString(),
        orderId = org.mockito.ArgumentMatchers.anyString(),
        orderName = org.mockito.ArgumentMatchers.anyString(),
        amount = org.mockito.ArgumentMatchers.anyInt(),
        paymentExpiresAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      ),
    ).willAnswer { invocation ->
      created.orderId = invocation.getArgument(3)
      1
    }
    val exception = CustomException(ErrorCode.CONFLICT, "changed")
    given(redisVenueSeatHoldService.transitionForPayment(eqGroupId(), anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN))).willThrow(exception)

    assertThat(
      assertThrows<CustomException> {
        service.startCheckout(USER_ID, PERFORMANCE_ID)
      },
    ).isSameAs(exception)
    assertThat(created.status).isEqualTo(ReservationStatus.EXPIRED)
  }

  @Test
  fun `예매가 없으면 만료 처리를 건너뛴다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)

    service.expireCheckout(RESERVATION_ID)

    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `아직 만료되지 않은 예매는 만료 처리하지 않는다`() {
    val reservation = reservation(paymentExpiresAt = LocalDateTime.now().plusMinutes(1))
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    service.expireCheckout(RESERVATION_ID)

    assertThat(reservation.status).isEqualTo(ReservationStatus.PAYMENT_PENDING)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @ParameterizedTest
  @EnumSource(
    value = ReservationStatus::class,
    names = ["PAYMENT_CONFIRMING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REFUND_REQUIRED", "REFUNDED"],
  )
  fun `결제 대기 상태가 아니면 만료 처리하지 않는다`(status: ReservationStatus) {
    val reservation = reservation(status = status, paymentExpiresAt = LocalDateTime.now().minusMinutes(1))
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)

    service.expireCheckout(RESERVATION_ID)

    assertThat(reservation.status).isEqualTo(status)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `결제 취소 대상 예매가 없으면 NOT_FOUND를 반환한다`() {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(null)

    assertThat(
      assertThrows<CustomException> {
        service.cancelCheckout(USER_ID, RESERVATION_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @ParameterizedTest
  @EnumSource(
    value = ReservationStatus::class,
    names = ["PAYMENT_CONFIRMING", "REFUND_REQUIRED", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REFUNDED"],
  )
  fun `종료 또는 진행 중인 예매는 취소할 수 없다`(status: ReservationStatus) {
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation(status = status))

    assertThat(
      assertThrows<CustomException> {
        service.cancelCheckout(USER_ID, RESERVATION_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
    then(redisVenueSeatHoldService).shouldHaveNoInteractions()
  }

  @Test
  fun `만료된 결제 대기를 취소하면 EXPIRED가 된다`() {
    val reservation = reservation(paymentExpiresAt = LocalDateTime.now().minusSeconds(1))
    val active = activeHoldData()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(active)

    val result = service.cancelCheckout(USER_ID, RESERVATION_ID)

    assertThat(result.status).isEqualTo(ReservationStatus.EXPIRED)
    assertThat(reservation.status).isEqualTo(ReservationStatus.EXPIRED)
  }

  @Test
  fun `Hold 해제 중 NOT_FOUND는 조용히 무시한다`() {
    val reservation = reservation()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willThrow(CustomException(ErrorCode.NOT_FOUND, "already released"))

    service.cancelCheckout(USER_ID, RESERVATION_ID)
  }

  @Test
  fun `Hold 조회 중 일반 예외는 취소와 함께 실패한다`() {
    val reservation = reservation()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willThrow(IllegalStateException("redis failed"))

    assertThrows<IllegalStateException> { service.cancelCheckout(USER_ID, RESERVATION_ID) }
  }

  @Test
  fun `기존 예매가 다른 그룹이면 FORBIDDEN을 반환한다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(reservation(groupId = "other:10"))

    val exception = assertThrows<CustomException> {
      service.startCheckout(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
  }

  @Test
  fun `기존 예매가 결제 대기 상태가 아니면 CONFLICT를 반환한다`() {
    given(redisVenueSeatHoldService.getGroupId(USER_ID, PERFORMANCE_ID)).willReturn(GROUP_ID)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID)).willReturn(activeHoldData())
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(reservation(status = ReservationStatus.SUCCEEDED))

    val exception = assertThrows<CustomException> {
      service.startCheckout(USER_ID, PERFORMANCE_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `결제 대기 취소에서 다른 CustomException은 전파한다`() {
    val reservation = reservation()
    given(reservationRepository.findByIdForUpdate(RESERVATION_ID)).willReturn(reservation)
    given(redisVenueSeatHoldService.findActiveHoldDataByGroupId(GROUP_ID))
      .willThrow(CustomException(ErrorCode.CONFLICT, "changed"))

    assertThrows<CustomException> { service.cancelCheckout(USER_ID, RESERVATION_ID) }
  }

  private fun activeHoldData(
    holds: List<VenueSeatHoldDetail> = listOf(hold("hold-1", listOf(101L, 102L))),
    groupId: String = GROUP_ID,
    performanceId: Long = PERFORMANCE_ID,
    entries: List<Long>? = null,
  ): ActiveHoldData {
    val first = holds.first()
    val seatEntries = entries ?: holds.flatMap { detail -> detail.venueSeatIds }
    return ActiveHoldData(
      groupId = groupId,
      performanceId = performanceId,
      holdGroupKey = "hold:group:$groupId",
      storedHoldDetailJsons = holds.map { "{}" },
      holdDetailKeys = holds.map { "hold:detail:${it.holdId}" },
      holdDetails = holds,
      holdVenueSeatEntries = seatEntries.map { id -> HoldVenueSeatEntry("hold:venue-seat:$performanceId:$id", first.holdId, id) },
    )
  }

  private fun hold(id: String, seats: List<Long>, groupId: String = GROUP_ID, performanceId: Long = PERFORMANCE_ID) =
    VenueSeatHoldDetail(id, groupId, performanceId, seats, LocalDateTime.now().plusMinutes(5))

  private fun reservation(
    id: Long = RESERVATION_ID,
    performance: Performance = performance(),
    booker: User = user(),
    status: ReservationStatus = ReservationStatus.PAYMENT_PENDING,
    amount: Int = 132_000,
    paymentExpiresAt: LocalDateTime = LocalDateTime.now().plusMinutes(5),
    orderId: String = "tikkle-order-501",
    groupId: String = GROUP_ID,
  ) = Reservation(
    id = id,
    performance = performance,
    booker = booker,
    groupId = groupId,
    orderId = orderId,
    orderName = "아이유 콘서트 1회차 2석",
    amount = amount,
    status = status,
    paymentExpiresAt = paymentExpiresAt,
  )

  private fun performance() = Performance(PERFORMANCE_ID, concert(), "1회차", LocalDateTime.of(2027, 1, 20, 19, 0))
  private fun concert() = Concert(1L, venue(), "아이유 콘서트", ConcertGenre.BALLAD)
  private fun venue() = Venue(
    VENUE_ID, "올림픽 체조경기장", "서울",
    width = BigDecimal(
      "100",
    ),
    height = BigDecimal(
      "100",
    ),
    stagePositionX = BigDecimal("20"), stagePositionY = BigDecimal("5"), stageWidth = BigDecimal("40"), stageHeight = BigDecimal("10"),
  )
  private fun venueSeat(id: Long, price: Int) = VenueSeat(id, venue(), "A", id.toInt(), "A-$id", price, BigDecimal("10"), BigDecimal("10"))
  private fun user(id: Long = USER_ID) = User(id, "user-$id@example.com", "사용자$id")

  private fun eqGroupId(): String {
    org.mockito.ArgumentMatchers.eq(GROUP_ID)
    return GROUP_ID
  }

  companion object {
    private const val USER_ID = 1L
    private const val OTHER_USER_ID = 2L
    private const val PERFORMANCE_ID = 10L
    private const val OTHER_PERFORMANCE_ID = 11L
    private const val VENUE_ID = 20L
    private const val GROUP_ID = "1:10"
    private const val RESERVATION_ID = 501L
  }
}

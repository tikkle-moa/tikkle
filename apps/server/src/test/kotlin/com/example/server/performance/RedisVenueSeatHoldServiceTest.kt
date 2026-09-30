package com.example.server.performance

import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.types.OutboxHoldActionResult
import com.example.server.performance.dto.PerformanceSeatStatusMessageData.HeldSeat
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Answers
import org.mockito.ArgumentMatchers.anyDouble
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.Mockito.mock
import org.mockito.Mockito.mockingDetails
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.data.redis.core.ZSetOperations
import tools.jackson.databind.ObjectMapper
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.Optional
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class RedisVenueSeatHoldServiceTest {
  @Mock lateinit var performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher

  @Mock lateinit var performanceRepository: PerformanceRepository

  @Mock lateinit var venueSeatRepository: VenueSeatRepository

  @Mock lateinit var reservationSeatRepository: ReservationSeatRepository

  @Mock lateinit var reservationRepository: ReservationRepository

  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock lateinit var valueOperations: ValueOperations<String, String>

  @Mock lateinit var zSetOperations: ZSetOperations<String, String>

  private val objectMapper = ObjectMapper()
  private lateinit var service: RedisVenueSeatHoldService

  private var executeResult: Any? = "0:1"

  @BeforeEach
  fun setUp() {
    executeResult = 0L
    stringRedisTemplate = mock(
      StringRedisTemplate::class.java,
      org.mockito.stubbing.Answer { invocation ->
        if (invocation.method.name == "execute") executeResult else Answers.RETURNS_DEFAULTS.answer(invocation)
      },
    )
    RedisVenueSeatHoldService(
      performanceVenueSeatStompPublisher,
      performanceRepository,
      venueSeatRepository,
      reservationSeatRepository,
      reservationRepository,
      stringRedisTemplate,
      objectMapper,
    ).also { service = it }
  }

  @Test
  fun `서버 시각과 좌석 상태 목록을 반환한다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = PERFORMANCE_ID,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(listOf(1L, 3L))
    val expiresAt = LocalDateTime.now().plusMinutes(4)
    val otherGroupHold = VenueSeatHoldDetail("other-hold", "2:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(102L, 101L), expiresAt)
    val myGroupHold = VenueSeatHoldDetail("my-hold", GROUP_ID, PERFORMANCE_ID, listOf(103L), expiresAt)
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(setOf("other-hold"))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get(VERSION_KEY)).willReturn(7L.toString())
    given(valueOperations.get("hold:detail:other-hold")).willReturn(objectMapper.writeValueAsString(otherGroupHold))
    executeResult = objectMapper.writeValueAsString(listOf(myGroupHold))

    val before = LocalDateTime.now()
    val result = service.getSeatStatus(USER_ID, PERFORMANCE_ID, null)
    val after = LocalDateTime.now()

    assertThat(result.version).isEqualTo(7L)
    assertThat(result.serverTime).isBetween(before, after)
    assertThat(result.bookedSeatIds).containsExactly(1L, 3L)
    assertThat(result.otherGroupHoldSeats).containsExactlyInAnyOrder(HeldSeat(101L, expiresAt), HeldSeat(102L, expiresAt))
    assertThat(result.myGroupHolds).containsExactly(myGroupHold)
  }

  @Test
  fun `취소 좌석 해제 결과에서 버전과 실제 해제한 좌석을 반환한다`() {
    executeResult = "0:8|101,102"

    val result = service.releaseCancelledReservationSeats(
      groupId = GROUP_ID,
      performanceId = PERFORMANCE_ID,
      venueSeatIds = listOf(101L, 102L),
      cancelledAtEpochMillis = System.currentTimeMillis(),
      eventId = UUID.fromString("e5c91ae3-27d0-4b06-9660-6f303f72c12c"),
    )

    assertThat(result).isEqualTo(
      CancelledReservationSeatReleaseResult(
        OutboxHoldActionResult.APPLIED,
        version = 8L,
        releasedVenueSeatIds = listOf(101L, 102L),
      ),
    )
  }

  @Test
  fun `이미 예매한 그룹의 Hold는 좌석 상태에 포함하지 않는다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = PERFORMANCE_ID,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(emptyList())
    given(reservationRepository.existsByGroupId(GROUP_ID)).willReturn(true)
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(emptySet())
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get(VERSION_KEY)).willReturn(1L.toString())

    val result = service.getSeatStatus(USER_ID, PERFORMANCE_ID, null)

    assertThat(result.myGroupHolds).isEmpty()
  }

  @Test
  fun `공연별 Hold ZSET에서 상세 정보가 없거나 만료된 Hold는 무시한다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = PERFORMANCE_ID,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(listOf(1L, 3L))
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble()))
      .willReturn(setOf("missing-hold", EXPIRED_HOLD_ID, SAME_GROUP_ACTIVE_HOLD_ID))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get(VERSION_KEY)).willReturn(7L.toString())
    given(valueOperations.get("hold:detail:missing-hold")).willReturn(null)
    given(valueOperations.get("hold:detail:$EXPIRED_HOLD_ID")).willReturn(
      objectMapper.writeValueAsString(
        VenueSeatHoldDetail(
          EXPIRED_HOLD_ID,
          GROUP_ID,
          PERFORMANCE_ID,
          listOf(103L),
          LocalDateTime.now().minusMinutes(1),
        ),
      ),
    )
    given(valueOperations.get("hold:detail:$SAME_GROUP_ACTIVE_HOLD_ID")).willReturn(
      objectMapper.writeValueAsString(
        VenueSeatHoldDetail(
          SAME_GROUP_ACTIVE_HOLD_ID,
          GROUP_ID,
          PERFORMANCE_ID,
          listOf(104L),
          LocalDateTime.now().plusMinutes(1),
        ),
      ),
    )
    executeResult = "[]"

    assertThat(service.getSeatStatus(USER_ID, PERFORMANCE_ID, null).otherGroupHoldSeats).isEmpty()
    then(zSetOperations).should().rangeByScore(anyString(), anyDouble(), anyDouble())
  }

  @Test
  fun `다른 사용자나 공연 회차의 그룹은 결제 단계에서 사용할 수 없다`() {
    assertThat(service.resolveGroupId(USER_ID, PERFORMANCE_ID, null)).isEqualTo(GROUP_ID)
    assertThat(service.resolveGroupId(USER_ID, PERFORMANCE_ID, GROUP_ID)).isEqualTo(GROUP_ID)
    assertThat(service.resolveGroupId(USER_ID, PERFORMANCE_ID, "$GROUP_ID:$SESSION_ID")).isEqualTo("$GROUP_ID:$SESSION_ID")

    listOf("2:$PERFORMANCE_ID:$SESSION_ID", "$USER_ID:11:$SESSION_ID").forEach { groupId ->
      val exception = assertThrows<CustomException> {
        service.resolveGroupId(USER_ID, PERFORMANCE_ID, groupId)
      }
      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    }
  }

  @Test
  fun `좌석 상태 조회 중 버전이 계속 변경되면 충돌을 반환한다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = PERFORMANCE_ID,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(emptyList())
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(emptySet())
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get(VERSION_KEY)).willReturn("1", "2", "3", "4", "5", "6")
    executeResult = "[]"

    val exception = assertThrows<CustomException> {
      service.getSeatStatus(USER_ID, PERFORMANCE_ID, null)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `공연별 Hold ZSET이 없으면 다른 그룹 점유 좌석을 빈 목록으로 반환한다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = PERFORMANCE_ID,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(emptyList())
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(null)
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get(VERSION_KEY)).willReturn(7L.toString())
    executeResult = "[]"

    val result = service.getSeatStatus(USER_ID, PERFORMANCE_ID, null)

    assertThat(result.otherGroupHoldSeats).isEmpty()
  }

  @Test
  fun `이벤트 version이 없으면 0으로 좌석 상태를 반환한다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = PERFORMANCE_ID,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(emptyList())
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(emptySet())
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    executeResult = "[]"

    assertThat(service.getSeatStatus(USER_ID, PERFORMANCE_ID, null).version).isZero()
  }

  @Test
  fun `공연이 없으면 예외를 던진다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.empty())
    val exception = assertThrows<CustomException> { service.getSeatStatus(USER_ID, PERFORMANCE_ID, null) }
    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `만료된 Hold는 Lua 결과의 version으로 해제 이벤트를 발행한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(VENUE_SEAT_ID), LocalDateTime.now().minusMinutes(1))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("hold:detail:$HOLD_ID")).willReturn(objectMapper.writeValueAsString(hold))
    executeResult = """{"version":8,"venueSeatIds":[$VENUE_SEAT_ID]}"""

    service.publishExpiredHold(HOLD_ID)

    val invocation = mockingDetails(performanceVenueSeatStompPublisher).invocations.single()
    assertThat(invocation.arguments[0]).isEqualTo(PERFORMANCE_ID)
    assertThat(invocation.arguments[1]).isEqualTo(listOf(VENUE_SEAT_ID))
    assertThat(invocation.arguments[2]).isEqualTo(8L)
  }

  @Test
  fun `만료 알림이 늦게 도착했으면 해제 이벤트를 발행하지 않는다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(VENUE_SEAT_ID), LocalDateTime.now().minusMinutes(1))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("hold:detail:$HOLD_ID")).willReturn(objectMapper.writeValueAsString(hold))
    executeResult = null

    service.publishExpiredHold(HOLD_ID)

    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `만료된 Hold 상세가 없으면 해제 이벤트를 발행하지 않는다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("hold:detail:$HOLD_ID")).willReturn(null)

    service.publishExpiredHold(HOLD_ID)

    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  @Test
  fun `점유 좌석 목록이 비어 있거나 양수가 아니면 거부한다`() {
    listOf(emptyList(), listOf(0L), listOf(-1L)).forEach { seatIds ->
      val exception = assertThrows<CustomException> {
        service.holdSeats(USER_ID, PERFORMANCE_ID, seatIds)
      }
      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }
  }

  @Test
  fun `점유 좌석 목록에 중복이 있으면 거부한다`() {
    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
  }

  @Test
  fun `결제 대기 이후에는 좌석을 추가할 수 없다`() {
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(mock())

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(performanceRepository).shouldHaveNoInteractions()
  }

  @Test
  fun `이전 그룹이 결제 대기 중이어도 새 세션은 다른 좌석을 점유할 수 있다`() {
    val nextGroupId = "$GROUP_ID:$SESSION_ID"
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(102L))).willReturn(listOf(venueSeat(102L)))
    executeResult = "0:1"

    val hold = service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(102L), SESSION_ID)

    assertThat(hold.groupId).isEqualTo(nextGroupId)
    then(reservationRepository).should().findByGroupIdForUpdate(nextGroupId)
    then(reservationRepository).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `결제 대기 이후에는 좌석을 부분 해제할 수 없다`() {
    given(reservationRepository.findByGroupIdForUpdate(GROUP_ID)).willReturn(mock())

    val exception = assertThrows<CustomException> {
      service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
    then(stringRedisTemplate).shouldHaveNoInteractions()
  }

  @Test
  fun `공연 회차를 찾지 못하면 점유를 생성하지 않는다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `공연장 좌석이 누락되면 점유를 생성하지 않는다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101L)))

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 102L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `이미 예매된 좌석이 있으면 점유를 생성하지 않는다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        PERFORMANCE_ID,
        listOf(101L),
        ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(true)

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `점유 스크립트가 성공하면 Hold detail을 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        PERFORMANCE_ID,
        listOf(101L),
        ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(false)
    executeResult = "0:1"

    val result = service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))

    assertThat(result.performanceId).isEqualTo(PERFORMANCE_ID)
    assertThat(result.groupId).isEqualTo("$USER_ID:$PERFORMANCE_ID")
  }

  @Test
  fun `점유 스크립트가 충돌하면 CONFLICT를 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        PERFORMANCE_ID,
        listOf(101L),
        ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(false)
    executeResult = "1:0"

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `점유 스크립트가 결과 없이 끝나면 충돌을 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        PERFORMANCE_ID,
        listOf(101L),
        ReservationStatus.BOOKED_SEAT_STATUSES,
      ),
    ).willReturn(false)
    executeResult = null

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `해제 좌석 목록이 비어 있거나 중복이면 거부한다`() {
    listOf(emptyList(), listOf(0L), listOf(101L, 101L)).forEach { seatIds ->
      val exception = assertThrows<CustomException> {
        service.releaseSeats(USER_ID, PERFORMANCE_ID, seatIds)
      }
      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }
  }

  @Test
  fun `점유되지 않은 좌석을 해제하면 NOT_FOUND를 반환한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(null))

    val exception = assertThrows<CustomException> {
      service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `점유 상세 정보가 없으면 NOT_FOUND를 반환한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(null))

    val exception = assertThrows<CustomException> {
      service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `다른 그룹의 점유 좌석은 해제할 수 없다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "other:10", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))

    val exception = assertThrows<CustomException> {
      service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
  }

  @Test
  fun `새 세션은 이전 세션의 점유 좌석을 해제할 수 없다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))

    val exception = assertThrows<CustomException> {
      service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L), SESSION_ID)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    then(reservationRepository).should().findByGroupIdForUpdate("$GROUP_ID:$SESSION_ID")
  }

  @Test
  fun `좌석 해제 스크립트가 성공하면 요청 좌석을 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = "0:2"

    assertThat(service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))).containsExactly(101L)
  }

  @Test
  fun `좌석 해제 스크립트 충돌은 CONFLICT로 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = "1:0"

    val exception = assertThrows<CustomException> {
      service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `부분 해제에서 남은 Hold detail을 갱신한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L, 102L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = "0:2"

    assertThat(service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))).containsExactly(101L)
  }

  @Test
  fun `해제 스크립트가 결과 없이 끝나면 충돌을 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = null

    assertThat(
      assertThrows<CustomException> {
        service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `Outbox Hold 해제 결과를 상태로 변환한다`() {
    val eventId = UUID.fromString("f2d0a95a-bc20-4f1b-9ac6-7ac89a2e0b73")
    mapOf(
      "0:3" to OutboxHoldActionResult.APPLIED,
      "1:0" to OutboxHoldActionResult.REPLACED,
      "2:0" to OutboxHoldActionResult.EXPIRED,
      "3:4" to OutboxHoldActionResult.ALREADY_APPLIED,
    ).forEach { (result, expected) ->
      executeResult = result

      assertThat(
        service.releaseVenueSeats(
          holdId = HOLD_ID,
          groupId = GROUP_ID,
          performanceId = PERFORMANCE_ID,
          venueSeatIds = listOf(101L),
          eventId = eventId,
        ),
      ).extracting(VenueSeatHoldActionResult::action).isEqualTo(expected)
    }
  }

  @Test
  fun `Outbox Hold 해제 결과가 없거나 알 수 없으면 예외를 던진다`() {
    executeResult = null

    assertThrows<IllegalStateException> {
      service.releaseVenueSeats(
        holdId = HOLD_ID,
        groupId = GROUP_ID,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(101L),
        eventId = UUID.randomUUID(),
      )
    }

    executeResult = "4:0"

    assertThrows<IllegalStateException> {
      service.releaseVenueSeats(
        holdId = HOLD_ID,
        groupId = GROUP_ID,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(101L),
        eventId = UUID.randomUUID(),
      )
    }
  }

  @Test
  fun `형식이 올바르지 않은 Lua 결과는 처리하지 않는다`() {
    listOf("invalid", "invalid:1", "0:invalid").forEach { result ->
      executeResult = result

      assertThrows<IllegalStateException> {
        service.releaseVenueSeats(
          holdId = HOLD_ID,
          groupId = GROUP_ID,
          performanceId = PERFORMANCE_ID,
          venueSeatIds = listOf(101L),
          eventId = UUID.randomUUID(),
        )
      }
    }
  }

  @Test
  fun `Outbox Hold 확정 결과를 상태로 변환한다`() {
    mapOf(
      "0:5" to VenueSeatHoldActionResult(OutboxHoldActionResult.APPLIED, 5L),
      "1:0" to VenueSeatHoldActionResult(OutboxHoldActionResult.REPLACED, 0L),
      "2:6" to VenueSeatHoldActionResult(OutboxHoldActionResult.ALREADY_APPLIED, 6L),
    ).forEach { (result, expected) ->
      executeResult = result

      assertThat(
        service.finalizeVenueSeats(
          holdId = HOLD_ID,
          groupId = GROUP_ID,
          performanceId = PERFORMANCE_ID,
          venueSeatIds = listOf(101L),
          eventId = UUID.randomUUID(),
        ),
      ).isEqualTo(expected)
    }
  }

  @Test
  fun `Outbox Hold 확정 결과가 없거나 알 수 없으면 예외를 던진다`() {
    executeResult = null

    assertThrows<IllegalStateException> {
      service.finalizeVenueSeats(
        holdId = HOLD_ID,
        groupId = GROUP_ID,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(101L),
        eventId = UUID.randomUUID(),
      )
    }

    executeResult = "3:0"

    assertThrows<IllegalStateException> {
      service.finalizeVenueSeats(
        holdId = HOLD_ID,
        groupId = GROUP_ID,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(101L),
        eventId = UUID.randomUUID(),
      )
    }
  }

  @Test
  fun `결제 전환과 전체 해제 스크립트의 성공을 처리한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = "0:7"

    assertThat(service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10), REVIEW_TOKEN, RESERVATION_ID)).hasSize(1)
    assertThat(service.releaseAllVenueSeats("$USER_ID:$PERFORMANCE_ID")).containsExactly(101L)
  }

  @Test
  fun `결제 전환과 전체 해제 스크립트 충돌은 CONFLICT로 반환한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = "1:0"

    assertThat(
      assertThrows<CustomException> {
        service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10), REVIEW_TOKEN, RESERVATION_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
    assertThat(
      assertThrows<CustomException> {
        service.releaseAllVenueSeats("$USER_ID:$PERFORMANCE_ID")
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `결제 전환 스크립트가 결과 없이 끝나면 충돌을 반환한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = null

    assertThat(
      assertThrows<CustomException> {
        service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10), REVIEW_TOKEN, RESERVATION_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `전체 해제 스크립트가 결과 없이 끝나면 충돌을 반환한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = null

    assertThat(
      assertThrows<CustomException> {
        service.releaseAllVenueSeats("$USER_ID:$PERFORMANCE_ID")
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `그룹 Hold가 없거나 상세 정보가 없으면 조회를 거부한다`() {
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(emptySet())
    assertThat(
      assertThrows<CustomException> {
        service.findActiveHoldDataByGroupId(GROUP_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.NOT_FOUND)

    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(setOf(HOLD_ID))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(null))
    assertThat(
      assertThrows<CustomException> {
        service.findActiveHoldDataByGroupId(GROUP_ID)
      }.errorCode,
    ).isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR)
  }

  @Test
  fun `그룹 Hold 상세를 조회하면 좌석 엔트리를 생성한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(101L, 102L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)

    val result = service.findActiveHoldDataByGroupId(GROUP_ID)

    assertThat(result.performanceId).isEqualTo(PERFORMANCE_ID)
    assertThat(result.holdVenueSeatEntries.map { it.venueSeatId }).containsExactly(101L, 102L)
  }

  @Test
  fun `예매 정보 확인 시작은 Redis snapshot을 반환한다`() {
    val expiresAt = LocalDateTime.now().plusMinutes(4)
    val expiresAtEpochMillis = expiresAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

    executeResult = """
    {
      "phase": "REVIEW",
      "groupId": "$GROUP_ID",
      "performanceId": $PERFORMANCE_ID,
      "holdIds": ["$HOLD_ID"],
      "venueSeatIds": [101],
      "expiresAtEpochMillis": $expiresAtEpochMillis,
      "reviewToken": "$REVIEW_TOKEN"
    }
    """.trimIndent()

    val result = service.beginCheckoutReview(GROUP_ID, PERFORMANCE_ID, REVIEW_TOKEN)

    assertThat(result.groupId).isEqualTo(GROUP_ID)
    assertThat(result.performanceId).isEqualTo(PERFORMANCE_ID)
    assertThat(result.venueSeatIds).containsExactly(101L)
    assertThat(result.reviewToken).isEqualTo(REVIEW_TOKEN)
  }

  @Test
  fun `예매 정보 확인 시작 결과가 없으면 예외를 던진다`() {
    executeResult = null

    assertThat(
      assertThrows<IllegalStateException> {
        service.beginCheckoutReview(GROUP_ID, PERFORMANCE_ID, REVIEW_TOKEN)
      },
    ).hasMessage("예매 정보 확인 결과를 확인하지 못했습니다.")
  }

  @Test
  fun `예매 정보 확인 시작 대상 Hold가 없으면 충돌을 반환한다`() {
    executeResult = "NOT_FOUND"

    assertThat(
      assertThrows<CustomException> {
        service.beginCheckoutReview(GROUP_ID, PERFORMANCE_ID, REVIEW_TOKEN)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `예매 정보 확인 중복 또는 결제 진행 중이면 충돌을 반환한다`() {
    executeResult = "CONFLICT"

    assertThat(
      assertThrows<CustomException> {
        service.beginCheckoutReview(GROUP_ID, PERFORMANCE_ID, REVIEW_TOKEN)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `예매 정보 확인 종료 성공을 처리한다`() {
    executeResult = 0L

    assertThat(service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)).isTrue()
  }

  @Test
  fun `END 응답 유실 뒤 같은 토큰으로 재요청하면 기존 해제 성공을 복구한다`() {
    executeResult = 0L
    service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)

    executeResult = 3L
    assertThat(service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)).isTrue()
  }

  @Test
  fun `이미 결제 대기 중이거나 잠금이 없으면 이전 점유로 복귀하지 않는다`() {
    executeResult = 2L

    assertThat(service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)).isFalse()
  }

  @Test
  fun `다른 토큰의 예매 정보 확인 잠금이면 이전 점유를 복원하지 않는다`() {
    executeResult = 1L

    assertThat(service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)).isFalse()
  }

  @Test
  fun `예매 정보 확인 종료 결과가 없으면 이전 점유를 복원하지 않는다`() {
    executeResult = null

    assertThat(service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)).isFalse()
  }

  private fun givenActiveHoldData(detail: VenueSeatHoldDetail) {
    given(stringRedisTemplate.opsForZSet()).willReturn(zSetOperations)
    given(zSetOperations.rangeByScore(anyString(), anyDouble(), anyDouble())).willReturn(setOf(HOLD_ID))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID")))
      .willReturn(listOf(objectMapper.writeValueAsString(detail)))
  }

  private fun performance() = Performance(
    PERFORMANCE_ID,
    Concert(1L, venue(), "공연", ConcertGenre.BALLAD),
    "1회차",
    LocalDateTime.now().plusDays(1),
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

  private fun venueSeat(id: Long) = VenueSeat(
    id,
    venue(),
    "A",
    id.toInt(),
    "A-$id",
    66_000,
    BigDecimal("10"),
    BigDecimal("10"),
  )

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L
    private const val VENUE_SEAT_ID = 101L
    private const val VENUE_ID = 20L
    private const val GROUP_ID = "1:10"
    private const val HOLD_ID = "hold-1"
    private const val EXPIRED_HOLD_ID = "hold-expired"
    private const val SAME_GROUP_ACTIVE_HOLD_ID = "hold-same-group-active"
    private const val VERSION_KEY = "performance:venue-seat-event-version:$PERFORMANCE_ID"
    private const val RESERVATION_ID = 501L
    private val REVIEW_TOKEN = UUID.fromString("25b619c1-f87a-4fbe-a2d7-2f16dc0cd1b3")
    private val SESSION_ID = UUID.fromString("88974819-50e7-4127-ae98-b178e3ec2346")
    private val OTHER_SESSION_ID = UUID.fromString("db60c466-7cbf-4470-96fa-0235016e44cc")
  }
}

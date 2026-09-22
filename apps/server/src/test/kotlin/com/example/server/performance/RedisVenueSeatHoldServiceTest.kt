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
import com.example.server.support.any
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
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.Cursor
import org.springframework.data.redis.core.ScanOptions
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

  @Mock lateinit var cursor: Cursor<String>

  private val objectMapper = ObjectMapper()
  private lateinit var service: RedisVenueSeatHoldService

  private var executeResult: Any? = 0L

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
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatus(
        performanceId = PERFORMANCE_ID,
        status = ReservationStatus.SUCCEEDED,
      ),
    ).willReturn(listOf(1L, 3L))
    val expiresAt = LocalDateTime.now().plusMinutes(4)
    val hold = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(102L, 101L), expiresAt)
    given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
    given(cursor.hasNext()).willReturn(true, true, false)
    given(cursor.next()).willReturn("hold:venue-seat:$PERFORMANCE_ID:101", "hold:venue-seat:$PERFORMANCE_ID:102")
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:101")).willReturn(HOLD_ID)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:102")).willReturn(HOLD_ID)
    given(valueOperations.get("hold:detail:$HOLD_ID")).willReturn(objectMapper.writeValueAsString(hold))

    val before = LocalDateTime.now()
    val result = service.getSeatStatus(PERFORMANCE_ID)
    val after = LocalDateTime.now()

    assertThat(result.serverTime).isBetween(before, after)
    assertThat(result.bookedSeatIds).containsExactly(1L, 3L)
    assertThat(result.heldSeats).containsExactly(HeldSeat(101L, expiresAt), HeldSeat(102L, expiresAt))
    then(cursor).should().close()
  }

  @Test
  fun `내가 점유한 좌석 목록을 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(4))
    executeResult = objectMapper.writeValueAsString(listOf(hold))

    assertThat(service.getMyGroupHolds(USER_ID, PERFORMANCE_ID)).containsExactly(hold)
  }

  @Test
  fun `세션마다 다른 점유 그룹을 만들고 해당 그룹 Hold를 조회한다`() {
    val groupId = "$GROUP_ID:$SESSION_ID"
    val hold = VenueSeatHoldDetail(HOLD_ID, groupId, PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(4))
    executeResult = objectMapper.writeValueAsString(listOf(hold))

    assertThat(service.getGroupId(USER_ID, PERFORMANCE_ID, SESSION_ID)).isEqualTo(groupId)
    assertThat(service.getGroupId(USER_ID, PERFORMANCE_ID, OTHER_SESSION_ID)).isNotEqualTo(groupId)
    assertThat(service.getMyGroupHolds(USER_ID, PERFORMANCE_ID, SESSION_ID)).containsExactly(hold)
    then(reservationRepository).should().existsByGroupId(groupId)
  }

  @Test
  fun `다른 사용자나 공연 회차의 그룹은 결제 단계에서 사용할 수 없다`() {
    assertThat(service.resolveGroupId(USER_ID, PERFORMANCE_ID, "$GROUP_ID:$SESSION_ID")).isEqualTo("$GROUP_ID:$SESSION_ID")

    listOf("2:$PERFORMANCE_ID:$SESSION_ID", "$USER_ID:11:$SESSION_ID").forEach { groupId ->
      val exception = assertThrows<CustomException> {
        service.resolveGroupId(USER_ID, PERFORMANCE_ID, groupId)
      }
      assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    }
  }

  @Test
  fun `예약이 있으면 점유 좌석을 사용자 소유로 반환하지 않는다`() {
    given(reservationRepository.existsByGroupId(GROUP_ID)).willReturn(true)

    assertThat(service.getMyGroupHolds(USER_ID, PERFORMANCE_ID)).isEmpty()
    then(stringRedisTemplate).shouldHaveNoInteractions()
  }

  @Test
  fun `좌석 키나 Hold 본문이 없거나 만료된 Hold는 무시한다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatus(
        performanceId = PERFORMANCE_ID,
        status = ReservationStatus.SUCCEEDED,
      ),
    ).willReturn(listOf(1L, 3L))
    given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
    given(cursor.hasNext()).willReturn(true, true, true, false)
    given(cursor.next()).willReturn(
      "hold:venue-seat:$PERFORMANCE_ID:101",
      "hold:venue-seat:$PERFORMANCE_ID:102",
      "hold:venue-seat:$PERFORMANCE_ID:103",
    )
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:101")).willReturn(null)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:102")).willReturn(HOLD_ID)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:103")).willReturn(EXPIRED_HOLD_ID)
    given(valueOperations.get("hold:detail:$HOLD_ID")).willReturn(null)
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

    assertThat(service.getSeatStatus(PERFORMANCE_ID).heldSeats).isEmpty()
    then(cursor).should().close()
  }

  @Test
  fun `Redis 스캔 중 예외가 나도 cursor를 닫는다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.of(performance()))
    given(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatus(
        performanceId = PERFORMANCE_ID,
        status = ReservationStatus.SUCCEEDED,
      ),
    ).willReturn(listOf(1L, 3L))
    given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
    given(cursor.hasNext()).willThrow(IllegalStateException("Redis scan failed"))

    val exception = assertThrows<IllegalStateException> { service.getSeatStatus(PERFORMANCE_ID) }

    assertThat(exception).hasMessage("Redis scan failed")
    then(cursor).should().close()
  }

  @Test
  fun `공연이 없으면 예외를 던진다`() {
    given(performanceRepository.findById(PERFORMANCE_ID)).willReturn(Optional.empty())
    val exception = assertThrows<CustomException> { service.getSeatStatus(PERFORMANCE_ID) }
    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
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
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L))).willReturn(true)

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `점유 스크립트가 성공하면 Hold detail을 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L))).willReturn(false)
    executeResult = 0L

    val result = service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))

    assertThat(result.performanceId).isEqualTo(PERFORMANCE_ID)
    assertThat(result.groupId).isEqualTo("$USER_ID:$PERFORMANCE_ID")
  }

  @Test
  fun `점유 스크립트가 충돌하면 CONFLICT를 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L))).willReturn(false)
    executeResult = 1L

    val exception = assertThrows<CustomException> {
      service.holdSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `점유 스크립트가 결과 없이 끝나면 충돌을 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L))).willReturn(false)
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
    executeResult = 0L

    assertThat(service.releaseSeats(USER_ID, PERFORMANCE_ID, listOf(101L))).containsExactly(101L)
  }

  @Test
  fun `좌석 해제 스크립트 충돌은 CONFLICT로 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = 1L

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
    executeResult = 0L

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
      0L to OutboxHoldActionResult.APPLIED,
      1L to OutboxHoldActionResult.REPLACED,
      2L to OutboxHoldActionResult.EXPIRED,
      3L to OutboxHoldActionResult.ALREADY_APPLIED,
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
      ).isEqualTo(expected)
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

    executeResult = 4L

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
  fun `Outbox Hold 확정 결과를 상태로 변환한다`() {
    mapOf(
      0L to OutboxHoldActionResult.APPLIED,
      1L to OutboxHoldActionResult.REPLACED,
      2L to OutboxHoldActionResult.ALREADY_APPLIED,
    ).forEach { (result, expected) ->
      executeResult = result

      assertThat(
        service.finalizeVenueSeats(
          holdId = HOLD_ID,
          groupId = GROUP_ID,
          performanceId = PERFORMANCE_ID,
          venueSeatIds = listOf(101L),
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
      )
    }

    executeResult = 3L

    assertThrows<IllegalStateException> {
      service.finalizeVenueSeats(
        holdId = HOLD_ID,
        groupId = GROUP_ID,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(101L),
      )
    }
  }

  @Test
  fun `결제 전환과 전체 해제 스크립트의 성공을 처리한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = 0L

    assertThat(service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10), REVIEW_TOKEN, RESERVATION_ID)).hasSize(1)
    assertThat(service.releaseAllVenueSeats("$USER_ID:$PERFORMANCE_ID")).containsExactly(101L)
  }

  @Test
  fun `결제 전환과 전체 해제 스크립트 충돌은 CONFLICT로 반환한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = 1L

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
  fun `이미 결제 대기 중이거나 잠금이 없으면 이전 점유로 복귀하지 않는다`() {
    executeResult = 2L

    assertThat(service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)).isFalse()
  }

  @Test
  fun `예매 정보 확인 종료 충돌을 반환한다`() {
    executeResult = 1L

    assertThat(
      assertThrows<CustomException> {
        service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `예매 정보 확인 종료 결과가 없으면 충돌을 반환한다`() {
    executeResult = null

    assertThat(
      assertThrows<CustomException> {
        service.endCheckoutReview(GROUP_ID, REVIEW_TOKEN)
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
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
    private const val VENUE_ID = 20L
    private const val GROUP_ID = "1:10"
    private const val HOLD_ID = "hold-1"
    private const val EXPIRED_HOLD_ID = "hold-expired"
    private const val RESERVATION_ID = 501L
    private val REVIEW_TOKEN = UUID.fromString("25b619c1-f87a-4fbe-a2d7-2f16dc0cd1b3")
    private val SESSION_ID = UUID.fromString("88974819-50e7-4127-ae98-b178e3ec2346")
    private val OTHER_SESSION_ID = UUID.fromString("db60c466-7cbf-4470-96fa-0235016e44cc")
  }
}

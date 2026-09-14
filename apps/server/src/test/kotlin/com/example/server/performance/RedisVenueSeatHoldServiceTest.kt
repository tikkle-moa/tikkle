package com.example.server.performance

import com.example.server.concert.entity.Concert
import com.example.server.concert.types.ConcertGenre
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Answers
import org.mockito.ArgumentMatchers.any
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

@ExtendWith(MockitoExtension::class)
class RedisVenueSeatHoldServiceTest {
  @Mock lateinit var performanceRepository: PerformanceRepository

  @Mock lateinit var venueSeatRepository: VenueSeatRepository

  @Mock lateinit var reservationSeatRepository: ReservationSeatRepository

  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock lateinit var valueOperations: ValueOperations<String, String>

  @Mock lateinit var zSetOperations: ZSetOperations<String, String>

  @Mock lateinit var cursor: Cursor<String>

  private val objectMapper = ObjectMapper()
  private lateinit var service: RedisVenueSeatHoldService

  private var executeResult: Long? = 0L

  @BeforeEach
  fun setUp() {
    stringRedisTemplate = mock(
      StringRedisTemplate::class.java,
      org.mockito.stubbing.Answer { invocation ->
        if (invocation.method.name == "execute") executeResult else Answers.RETURNS_DEFAULTS.answer(invocation)
      },
    )
    RedisVenueSeatHoldService(
      performanceRepository,
      venueSeatRepository,
      reservationSeatRepository,
      stringRedisTemplate,
      objectMapper,
    ).also { service = it }
  }

  @Test
  fun `공연의 활성 Hold 좌석을 만료 시각과 함께 반환한다`() {
    val expiresAt = LocalDateTime.now().plusMinutes(4)
    val hold = VenueSeatHoldDetail(HOLD_ID, GROUP_ID, PERFORMANCE_ID, listOf(102L, 101L), expiresAt)
    given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
    given(cursor.hasNext()).willReturn(true, true, false)
    given(cursor.next()).willReturn("hold:venue-seat:$PERFORMANCE_ID:101", "hold:venue-seat:$PERFORMANCE_ID:102")
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:101")).willReturn(HOLD_ID)
    given(valueOperations.get("hold:venue-seat:$PERFORMANCE_ID:102")).willReturn(HOLD_ID)
    given(valueOperations.get("hold:detail:$HOLD_ID")).willReturn(objectMapper.writeValueAsString(hold))

    val result = service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)

    assertThat(result).containsExactly(HeldSeat(101L, expiresAt), HeldSeat(102L, expiresAt))
    then(cursor).should().close()
  }

  @Test
  fun `좌석 키나 Hold 본문이 없거나 만료된 Hold는 무시한다`() {
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

    assertThat(service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)).isEmpty()
    then(cursor).should().close()
  }

  @Test
  fun `Redis 스캔 중 예외가 나도 cursor를 닫는다`() {
    given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
    given(cursor.hasNext()).willThrow(IllegalStateException("Redis scan failed"))

    val exception = assertThrows<IllegalStateException> { service.findHeldSeatsByPerformanceId(PERFORMANCE_ID) }

    assertThat(exception).hasMessage("Redis scan failed")
    then(cursor).should().close()
  }

  @Test
  fun `점유 좌석 목록이 비어 있거나 양수가 아니면 거부한다`() {
    listOf(emptyList(), listOf(0L), listOf(-1L)).forEach { seatIds ->
      val exception = assertThrows<CustomException> {
        service.holdVenueSeats(USER_ID, PERFORMANCE_ID, seatIds)
      }
      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }
  }

  @Test
  fun `점유 좌석 목록에 중복이 있으면 거부한다`() {
    val exception = assertThrows<CustomException> {
      service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
  }

  @Test
  fun `공연 회차를 찾지 못하면 점유를 생성하지 않는다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(null)

    val exception = assertThrows<CustomException> {
      service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `공연장 좌석이 누락되면 점유를 생성하지 않는다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L, 102L)))
      .willReturn(listOf(venueSeat(101L)))

    val exception = assertThrows<CustomException> {
      service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L, 102L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `이미 예매된 좌석이 있으면 점유를 생성하지 않는다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L))).willReturn(true)

    val exception = assertThrows<CustomException> {
      service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `점유 스크립트가 성공하면 Hold detail을 반환한다`() {
    given(performanceRepository.findByIdWithConcertAndVenue(PERFORMANCE_ID)).willReturn(performance())
    given(venueSeatRepository.findAllByVenueIdAndIdIn(VENUE_ID, listOf(101L))).willReturn(listOf(venueSeat(101L)))
    given(reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(PERFORMANCE_ID, listOf(101L))).willReturn(false)
    executeResult = 0L

    val result = service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))

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
      service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
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
      service.holdVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `해제 좌석 목록이 비어 있거나 중복이면 거부한다`() {
    listOf(emptyList(), listOf(0L), listOf(101L, 101L)).forEach { seatIds ->
      val exception = assertThrows<CustomException> {
        service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, seatIds)
      }
      assertThat(exception.errorCode).isEqualTo(ErrorCode.BAD_REQUEST)
    }
  }

  @Test
  fun `점유되지 않은 좌석을 해제하면 NOT_FOUND를 반환한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(null))

    val exception = assertThrows<CustomException> {
      service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.NOT_FOUND)
  }

  @Test
  fun `점유 상세 정보가 없으면 NOT_FOUND를 반환한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(null))

    val exception = assertThrows<CustomException> {
      service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
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
      service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
  }

  @Test
  fun `좌석 해제 스크립트가 성공하면 요청 좌석을 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = 0L

    assertThat(service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))).containsExactly(101L)
  }

  @Test
  fun `좌석 해제 스크립트 충돌은 CONFLICT로 반환한다`() {
    val hold = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.multiGet(listOf("hold:venue-seat:$PERFORMANCE_ID:101"))).willReturn(listOf(HOLD_ID))
    given(valueOperations.multiGet(listOf("hold:detail:$HOLD_ID"))).willReturn(listOf(objectMapper.writeValueAsString(hold)))
    executeResult = 1L

    val exception = assertThrows<CustomException> {
      service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
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

    assertThat(service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))).containsExactly(101L)
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
        service.releaseVenueSeats(USER_ID, PERFORMANCE_ID, listOf(101L))
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `결제 전환과 최종 해제 스크립트의 성공 및 충돌을 처리한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = 0L

    assertThat(service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10))).hasSize(1)
    assertThat(service.finalizeForPayment("$USER_ID:$PERFORMANCE_ID")).containsExactly(101L)
    assertThat(service.releaseAllVenueSeats("$USER_ID:$PERFORMANCE_ID")).containsExactly(101L)
  }

  @Test
  fun `결제 전환과 최종 해제 스크립트 충돌은 CONFLICT로 반환한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = 1L

    assertThat(
      assertThrows<CustomException> {
        service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10))
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
    assertThat(
      assertThrows<CustomException> {
        service.finalizeForPayment("$USER_ID:$PERFORMANCE_ID")
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
        service.transitionForPayment("$USER_ID:$PERFORMANCE_ID", LocalDateTime.now().plusMinutes(10))
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
  }

  @Test
  fun `최종 확정과 전체 해제 스크립트가 결과 없이 끝나면 충돌을 반환한다`() {
    val detail = VenueSeatHoldDetail(HOLD_ID, "$USER_ID:$PERFORMANCE_ID", PERFORMANCE_ID, listOf(101L), LocalDateTime.now().plusMinutes(5))
    givenActiveHoldData(detail)
    executeResult = null

    assertThat(
      assertThrows<CustomException> {
        service.finalizeForPayment("$USER_ID:$PERFORMANCE_ID")
      }.errorCode,
    ).isEqualTo(ErrorCode.CONFLICT)
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
  }
}

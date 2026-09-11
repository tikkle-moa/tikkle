package com.example.server.performance

import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.SeatHold
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.Cursor
import org.springframework.data.redis.core.ScanOptions
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class RedisSeatHoldServiceTest {
  @Mock
  lateinit var performanceRepository: PerformanceRepository

  @Mock
  lateinit var venueSeatRepository: VenueSeatRepository

  @Mock
  lateinit var reservationSeatRepository: ReservationSeatRepository

  @Mock
  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock
  lateinit var valueOperations: ValueOperations<String, String>

  @Mock
  lateinit var cursor: Cursor<String>

  private val objectMapper = ObjectMapper()

  private val service by lazy {
    RedisSeatHoldService(
      performanceRepository = performanceRepository,
      venueSeatRepository = venueSeatRepository,
      reservationSeatRepository = reservationSeatRepository,
      stringRedisTemplate = stringRedisTemplate,
      objectMapper = objectMapper,
    )
  }

  @Nested
  @DisplayName("findHeldSeatsByPerformanceId")
  inner class FindHeldSeatsByPerformanceId {
    @Test
    fun `공연의 활성 Hold 좌석을 만료 시각과 함께 반환한다`() {
      val expiresAt = LocalDateTime.now().plusMinutes(4)
      val hold = SeatHold(
        holdId = HOLD_ID,
        ownerUserId = 1L,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(102L, 101L),
        expiresAt = expiresAt,
      )

      given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
      given(cursor.hasNext()).willReturn(true, true, false)
      given(cursor.next()).willReturn("hold:seat:$PERFORMANCE_ID:101", "hold:seat:$PERFORMANCE_ID:102")
      given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
      given(valueOperations.get("hold:seat:$PERFORMANCE_ID:101")).willReturn(HOLD_ID)
      given(valueOperations.get("hold:seat:$PERFORMANCE_ID:102")).willReturn(HOLD_ID)
      given(valueOperations.get("hold:$HOLD_ID")).willReturn(objectMapper.writeValueAsString(hold))

      val result = service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)

      assertThat(result).containsExactly(
        HeldSeat(id = 101L, expiresAt = expiresAt),
        HeldSeat(id = 102L, expiresAt = expiresAt),
      )
      then(cursor).should().close()
    }

    @Test
    fun `좌석 Hold 키가 만료되어 holdId를 찾지 못하면 무시한다`() {
      given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
      given(cursor.hasNext()).willReturn(true, false)
      given(cursor.next()).willReturn("hold:seat:$PERFORMANCE_ID:101")
      given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
      given(valueOperations.get("hold:seat:$PERFORMANCE_ID:101")).willReturn(null)

      val result = service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)

      assertThat(result).isEmpty()
      then(cursor).should().close()
    }

    @Test
    fun `Hold 본문이 만료되어 찾지 못하면 무시한다`() {
      given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
      given(cursor.hasNext()).willReturn(true, false)
      given(cursor.next()).willReturn("hold:seat:$PERFORMANCE_ID:101")
      given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
      given(valueOperations.get("hold:seat:$PERFORMANCE_ID:101")).willReturn(HOLD_ID)
      given(valueOperations.get("hold:$HOLD_ID")).willReturn(null)

      val result = service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)

      assertThat(result).isEmpty()
      then(cursor).should().close()
    }

    @Test
    fun `만료 시각이 지난 Hold는 무시한다`() {
      val expiredHold = SeatHold(
        holdId = HOLD_ID,
        ownerUserId = 1L,
        performanceId = PERFORMANCE_ID,
        venueSeatIds = listOf(101L),
        expiresAt = LocalDateTime.now().minusMinutes(1),
      )

      given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
      given(cursor.hasNext()).willReturn(true, false)
      given(cursor.next()).willReturn("hold:seat:$PERFORMANCE_ID:101")
      given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
      given(valueOperations.get("hold:seat:$PERFORMANCE_ID:101")).willReturn(HOLD_ID)
      given(valueOperations.get("hold:$HOLD_ID")).willReturn(objectMapper.writeValueAsString(expiredHold))

      val result = service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)

      assertThat(result).isEmpty()
      then(cursor).should().close()
    }

    @Test
    fun `좌석 Hold 키 스캔 중 예외가 나도 cursor를 닫는다`() {
      given(stringRedisTemplate.scan(any(ScanOptions::class.java))).willReturn(cursor)
      given(cursor.hasNext()).willThrow(IllegalStateException("Redis scan failed"))

      val exception = assertThrows<IllegalStateException> {
        service.findHeldSeatsByPerformanceId(PERFORMANCE_ID)
      }

      assertThat(exception).hasMessage("Redis scan failed")
      then(cursor).should().close()
    }
  }

  companion object {
    private const val PERFORMANCE_ID = 10L
    private const val HOLD_ID = "hold-1"
  }
}

package com.example.server.performance

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper
import java.time.Duration
import java.time.LocalDateTime
import java.util.UUID

@Service
class RedisSeatHoldService(
  private val performanceRepository: PerformanceRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
  private val stringRedisTemplate: StringRedisTemplate,
  private val objectMapper: ObjectMapper,
) : SeatHoldService {
  override fun create(performanceId: Long, ownerUserId: Long, venueSeatIds: List<Long>): SeatHold {
    val seatIds = venueSeatIds.distinct()

    if (seatIds.isEmpty()) {
      throw CustomException(ErrorCode.BAD_REQUEST, "최소 한 좌석을 선택해야 합니다.")
    }

    val performance = performanceRepository.findByIdWithConcertAndVenue(performanceId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.")

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(
      performance.concert.venue.id,
      seatIds,
    )

    if (venueSeats.size != seatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    if (reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(performanceId, seatIds)) {
      throw CustomException(ErrorCode.CONFLICT, "이미 예매된 좌석이 포함되어 있습니다.")
    }

    val hold = SeatHold(
      holdId = UUID.randomUUID().toString(),
      ownerUserId = ownerUserId,
      performanceId = performanceId,
      venueSeatIds = seatIds,
      expiresAt = LocalDateTime.now().plus(SEAT_HOLD_TTL),
    )

    val created = stringRedisTemplate.execute(
      createHoldScript,
      hold.venueSeatIds.map { seatKey(hold.performanceId, it) } + holdKey(hold.holdId),
      hold.holdId,
      SEAT_HOLD_TTL.toMillis().toString(),
      objectMapper.writeValueAsString(hold),
    ) == 1L

    if (!created) {
      throw CustomException(ErrorCode.CONFLICT, "이미 점유된 좌석이 포함되어 있습니다.")
    }

    return hold
  }

  override fun findActive(holdId: String): SeatHold? {
    val value = stringRedisTemplate.opsForValue().get(holdKey(holdId))
      ?: return null

    return objectMapper.readValue(value, SeatHold::class.java)
  }

  override fun extendForPayment(holdId: String, paymentExpiresAt: LocalDateTime): SeatHold? {
    val hold = findActive(holdId)
      ?: return null

    val ttl = Duration.between(LocalDateTime.now(), paymentExpiresAt)

    if (ttl.isZero || ttl.isNegative) {
      return null
    }

    val extendedHold = hold.copy(expiresAt = paymentExpiresAt)

    val extended = stringRedisTemplate.execute(
      extendHoldScript,
      hold.venueSeatIds.map { seatKey(hold.performanceId, it) } + holdKey(hold.holdId),
      hold.holdId,
      ttl.toMillis().toString(),
      objectMapper.writeValueAsString(extendedHold),
    ) == 1L

    return extendedHold.takeIf { extended }
  }

  override fun release(holdId: String): SeatHold? {
    val hold = findActive(holdId)
      ?: return null

    val released = stringRedisTemplate.execute(
      releaseHoldScript,
      hold.venueSeatIds.map { seatKey(hold.performanceId, it) } + holdKey(hold.holdId),
      hold.holdId,
    ) ?: return null

    return hold.takeIf { released > 0 }
  }

  private fun holdKey(holdId: String) = "hold:$holdId"

  private fun seatKey(performanceId: Long, venueSeatId: Long) = "hold:seat:$performanceId:$venueSeatId"

  companion object {
    private val SEAT_HOLD_TTL = Duration.ofMinutes(5)

    private val createHoldScript = DefaultRedisScript<Long>().apply {
      setResultType(Long::class.java)
      setScriptText(
        """
        for i = 1, #KEYS - 1 do
          if redis.call('EXISTS', KEYS[i]) == 1 then
            return 0
          end
        end

        for i = 1, #KEYS - 1 do
          redis.call('SET', KEYS[i], ARGV[1], 'PX', ARGV[2])
        end

        redis.call('SET', KEYS[#KEYS], ARGV[3], 'PX', ARGV[2])
        return 1
        """.trimIndent(),
      )
    }

    private val extendHoldScript = DefaultRedisScript<Long>().apply {
      setResultType(Long::class.java)
      setScriptText(
        """
        if redis.call('EXISTS', KEYS[#KEYS]) == 0 then
          return 0
        end

        for i = 1, #KEYS - 1 do
          if redis.call('GET', KEYS[i]) ~= ARGV[1] then
            return 0
          end
        end

        for i = 1, #KEYS - 1 do
          redis.call('PEXPIRE', KEYS[i], ARGV[2])
        end

        redis.call('SET', KEYS[#KEYS], ARGV[3], 'PX', ARGV[2])
        return 1
        """.trimIndent(),
      )
    }

    private val releaseHoldScript = DefaultRedisScript<Long>().apply {
      setResultType(Long::class.java)
      setScriptText(
        """
        local released = 0

        for i = 1, #KEYS - 1 do
          if redis.call('GET', KEYS[i]) == ARGV[1] then
            released = released + redis.call('DEL', KEYS[i])
          end
        end
        
        released = released + redis.call('DEL', KEYS[#KEYS])
        return released
        """.trimIndent(),
      )
    }
  }
}

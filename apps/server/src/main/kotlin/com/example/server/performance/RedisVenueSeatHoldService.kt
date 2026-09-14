package com.example.server.performance

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.core.io.ClassPathResource
import org.springframework.data.redis.core.ScanOptions
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Service
import tools.jackson.databind.ObjectMapper
import java.time.Duration
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class RedisVenueSeatHoldService(
  private val performanceRepository: PerformanceRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
  private val stringRedisTemplate: StringRedisTemplate,
  private val objectMapper: ObjectMapper,
) {
  fun findHeldSeatsByPerformanceId(performanceId: Long): List<HeldSeat> {
    val now = LocalDateTime.now()
    val holdIds = mutableSetOf<String>()

    stringRedisTemplate.scan(
      ScanOptions.scanOptions()
        .match("hold:venue-seat:$performanceId:*")
        .count(100)
        .build(),
    ).use { cursor ->
      while (cursor.hasNext()) {
        stringRedisTemplate.opsForValue()
          .get(cursor.next())
          ?.let { holdIds += it }
      }
    }

    return holdIds
      .mapNotNull { holdId ->
        stringRedisTemplate.opsForValue()
          .get(holdDetailKey(holdId))
          ?.let { objectMapper.readValue(it, VenueSeatHoldDetail::class.java) }
      }
      .filter { it.expiresAt.isAfter(now) }
      .flatMap { hold ->
        hold.venueSeatIds.map { seatId -> HeldSeat(id = seatId, expiresAt = hold.expiresAt) }
      }
      .sortedBy(HeldSeat::id)
  }

  fun holdVenueSeats(userId: Long, performanceId: Long, venueSeatIds: List<Long>): VenueSeatHoldDetail {
    validateVenueSeatIds(venueSeatIds)

    val performance = performanceRepository.findByIdWithConcertAndVenue(performanceId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.")

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(performance.concert.venue.id, venueSeatIds)
    if (venueSeats.size != venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    if (reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(performanceId, venueSeatIds)) {
      throw CustomException(ErrorCode.CONFLICT, "이미 예매된 좌석이 포함되어 있습니다.")
    }

    val groupId = getGroupId(userId, performanceId)
    val holdDetail = VenueSeatHoldDetail(
      holdId = UUID.randomUUID().toString(),
      groupId = groupId,
      performanceId = performanceId,
      venueSeatIds = venueSeatIds,
      expiresAt = LocalDateTime.now().plus(SEAT_HOLD_TTL).truncatedTo(ChronoUnit.MILLIS),
    )

    val keys = holdDetail.venueSeatIds.map { holdVenueSeatKey(holdDetail.performanceId, it) } + listOf(
      holdDetailKey(holdDetail.holdId),
      holdGroupKey(holdDetail.groupId),
    )

    val held = stringRedisTemplate.execute(
      holdVenueSeatsScript,
      keys,
      holdDetail.holdId,
      holdDetail.expiresAt.toEpochMillis().toString(),
      objectMapper.writeValueAsString(holdDetail),
    ) == 0L

    if (!held) {
      throw CustomException(ErrorCode.CONFLICT, "이미 점유된 좌석이 포함되어 있습니다.")
    }

    return holdDetail
  }

  fun releaseVenueSeats(userId: Long, performanceId: Long, venueSeatIds: List<Long>): List<Long> {
    validateVenueSeatIds(venueSeatIds)

    val groupId = getGroupId(userId, performanceId)
    val venueSeatKeys = venueSeatIds.map { holdVenueSeatKey(performanceId, it) }
    val holdIds = stringRedisTemplate.opsForValue().multiGet(venueSeatKeys)
      .map { it ?: throw CustomException(ErrorCode.NOT_FOUND, "점유되지 않은 좌석이 포함되어 있습니다.") }

    val seatIdsByHoldId = venueSeatIds
      .zip(holdIds)
      .groupBy(keySelector = { (_, holdId) -> holdId }, valueTransform = { (venueSeatId, _) -> venueSeatId })
      .mapValues { (_, seatIds) -> seatIds.toSet() }

    val holdDetailKeys = seatIdsByHoldId.keys.map { holdDetailKey(it) }
    val storedHoldDetails = stringRedisTemplate.opsForValue().multiGet(holdDetailKeys)
    val holdDetails = storedHoldDetails.map { value ->
      value
        ?.let { objectMapper.readValue(it, VenueSeatHoldDetail::class.java) }
        ?.also { if (it.groupId != groupId) throw CustomException(ErrorCode.FORBIDDEN, "홀드에 대한 권한이 없습니다.") }
        ?: throw CustomException(ErrorCode.NOT_FOUND, "좌석 점유 정보를 찾을 수 없습니다.")
    }

    val updatedHoldDetails = holdDetails.map { holdDetail ->
      val seatIds = seatIdsByHoldId.getValue(holdDetail.holdId)
      holdDetail.copy(venueSeatIds = holdDetail.venueSeatIds.filterNot { it in seatIds })
    }

    val (emptyHoldDetails, remainingHoldDetails) = storedHoldDetails.zip(updatedHoldDetails).partition { (_, updated) ->
      updated.venueSeatIds.isEmpty()
    }

    val keys = venueSeatKeys +
      emptyHoldDetails.map { (_, updated) -> holdDetailKey(updated.holdId) } +
      remainingHoldDetails.map { (_, updated) -> holdDetailKey(updated.holdId) } +
      listOf(holdGroupKey(groupId))

    val released = stringRedisTemplate.execute(
      releaseVenueSeatsScript,
      keys,
      venueSeatKeys.size.toString(),
      emptyHoldDetails.size.toString(),
      remainingHoldDetails.size.toString(),
      *holdIds.toTypedArray(),
      *(emptyHoldDetails + remainingHoldDetails).map { (stored, _) -> requireNotNull(stored) }.toTypedArray(),
      *emptyHoldDetails.map { (_, updated) -> updated.holdId }.toTypedArray(),
      *remainingHoldDetails.map { (_, updated) -> objectMapper.writeValueAsString(updated) }.toTypedArray(),
    ) == 0L

    if (!released) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 해제할 수 없습니다.")
    }

    return venueSeatIds
  }

  fun getGroupId(userId: Long, performanceId: Long): String {
    // 추후 사용자 ID를 기반으로 그룹 ID를 가져오는 로직 구현 필요
    // 현재는 단순히 사용자 ID를 문자열로 변환하여 그룹 ID로 사용
    return "$userId:$performanceId"
  }

  private fun validateVenueSeatIds(venueSeatIds: List<Long>) {
    if (venueSeatIds.isEmpty() || venueSeatIds.any { it <= 0 }) {
      throw CustomException(ErrorCode.BAD_REQUEST, "좌석 ID는 한 개 이상의 양수여야 합니다.")
    }
    if (venueSeatIds.distinct().size != venueSeatIds.size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 좌석 ID가 포함되어 있습니다.")
    }
  }

  private fun holdGroupKey(groupId: String) = "hold:group:$groupId"
  private fun holdDetailKey(holdId: String) = "hold:detail:$holdId"
  private fun holdVenueSeatKey(performanceId: Long, venueSeatId: Long) = "hold:venue-seat:$performanceId:$venueSeatId"

  private fun LocalDateTime.toEpochMillis(): Long = atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

  companion object {
    private val SEAT_HOLD_TTL = Duration.ofMinutes(5)

    private val holdVenueSeatsScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/hold-venue-seats.lua"))
      resultType = Long::class.java
    }

    private val releaseVenueSeatsScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/release-venue-seats.lua"))
      resultType = Long::class.java
    }
  }
}

package com.example.server.performance

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.outbox.types.OutboxHoldActionResult
import com.example.server.performance.dto.ActiveHoldData
import com.example.server.performance.dto.HeldSeat
import com.example.server.performance.dto.HoldVenueSeatEntry
import com.example.server.performance.dto.PerformanceSeatStatusMessageData
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.core.io.ClassPathResource
import org.springframework.data.redis.core.ScanOptions
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.script.DefaultRedisScript
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
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
  private val reservationRepository: ReservationRepository,
  private val stringRedisTemplate: StringRedisTemplate,
  private val objectMapper: ObjectMapper,
) {
  @Transactional(readOnly = true)
  fun getSeatStatus(performanceId: Long): PerformanceSeatStatusMessageData {
    performanceRepository.findById(performanceId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    return PerformanceSeatStatusMessageData(
      serverTime = LocalDateTime.now(),
      bookedSeats = reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatus(
        performanceId = performanceId,
        status = ReservationStatus.SUCCEEDED,
      ),
      heldSeats = findHeldSeatsByPerformanceId(performanceId),
    )
  }

  fun getMyGroupHolds(userId: Long, performanceId: Long): List<VenueSeatHoldDetail> {
    val groupId = getGroupId(userId, performanceId)

    val heldSeatsJson = stringRedisTemplate.execute(
      getMyHeldSeatsScript,
      listOf(holdGroupKey(groupId)),
      HOLD_DETAIL_KEY_PREFIX,
    )

    return objectMapper
      .readValue(heldSeatsJson, Array<VenueSeatHoldDetail>::class.java)
      .toList()
  }

  @Transactional
  fun holdVenueSeats(userId: Long, performanceId: Long, venueSeatIds: List<Long>): VenueSeatHoldDetail {
    validateVenueSeatIds(venueSeatIds)

    val groupId = getGroupId(userId, performanceId)
    ensureHoldModificationAllowed(groupId)

    val performance = performanceRepository.findByIdWithConcertAndVenue(performanceId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.")

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(performance.concert.venue.id, venueSeatIds)
    if (venueSeats.size != venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    if (reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdIn(performanceId, venueSeatIds)) {
      throw CustomException(ErrorCode.CONFLICT, "이미 예매된 좌석이 포함되어 있습니다.")
    }

    val holdDetail = VenueSeatHoldDetail(
      holdId = UUID.randomUUID().toString(),
      groupId = groupId,
      performanceId = performanceId,
      venueSeatIds = venueSeatIds,
      expiresAt = LocalDateTime.now().plus(SEAT_HOLD_TTL).truncatedTo(ChronoUnit.MILLIS),
    )

    val venueSeatKeys = holdDetail.venueSeatIds.map { holdVenueSeatKey(holdDetail.performanceId, it) }
    val finalizingVenueSeatKeys = holdDetail.venueSeatIds.map { finalizingVenueSeatKey(holdDetail.performanceId, it) }
    val keys = venueSeatKeys + finalizingVenueSeatKeys + listOf(
      holdDetailKey(holdDetail.holdId),
      holdGroupKey(holdDetail.groupId),
    )

    val held = stringRedisTemplate.execute(
      holdVenueSeatsScript,
      keys,
      holdDetail.holdId,
      holdDetail.expiresAt.toEpochMillis().toString(),
      objectMapper.writeValueAsString(holdDetail),
      venueSeatKeys.size.toString(),
    ) == 0L

    if (!held) {
      throw CustomException(ErrorCode.CONFLICT, "이미 점유된 좌석이 포함되어 있습니다.")
    }

    return holdDetail
  }

  @Transactional
  fun releaseVenueSeats(userId: Long, performanceId: Long, venueSeatIds: List<Long>): List<Long> {
    validateVenueSeatIds(venueSeatIds)

    val groupId = getGroupId(userId, performanceId)
    ensureHoldModificationAllowed(groupId)

    val venueSeatKeys = venueSeatIds.map { holdVenueSeatKey(performanceId, it) }
    val holdIds = stringRedisTemplate.opsForValue().multiGet(venueSeatKeys)
      .map { it ?: throw CustomException(ErrorCode.NOT_FOUND, "점유되지 않은 좌석이 포함되어 있습니다.") }

    val seatIdsByHoldId = venueSeatIds
      .zip(holdIds)
      .groupBy(keySelector = { (_, holdId) -> holdId }, valueTransform = { (venueSeatId, _) -> venueSeatId })
      .mapValues { (_, seatIds) -> seatIds.toSet() }

    val holdDetailKeys = seatIdsByHoldId.keys.map { holdDetailKey(it) }
    val storedHoldDetails = stringRedisTemplate.opsForValue().multiGet(holdDetailKeys)
      .map { it ?: throw CustomException(ErrorCode.NOT_FOUND, "좌석 점유 정보를 찾을 수 없습니다.") }
    val holdDetails = storedHoldDetails.map { value ->
      objectMapper.readValue(value, VenueSeatHoldDetail::class.java)
        .also { if (it.groupId != groupId) throw CustomException(ErrorCode.FORBIDDEN, "홀드에 대한 권한이 없습니다.") }
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
      *(emptyHoldDetails + remainingHoldDetails).map { (stored, _) -> stored }.toTypedArray(),
      *emptyHoldDetails.map { (_, updated) -> updated.holdId }.toTypedArray(),
      *remainingHoldDetails.map { (_, updated) -> objectMapper.writeValueAsString(updated) }.toTypedArray(),
    ) == 0L

    if (!released) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 해제할 수 없습니다.")
    }

    return venueSeatIds
  }

  fun transitionForPayment(groupId: String, paymentExpiresAt: LocalDateTime): List<VenueSeatHoldDetail> {
    val activeHoldData = findActiveHoldDataByGroupId(groupId)

    val keys = activeHoldData.holdVenueSeatEntries.map { it.key } +
      activeHoldData.holdDetailKeys +
      activeHoldData.holdGroupKey

    val transitionedHoldDetails = activeHoldData.holdDetails.map { it.copy(expiresAt = paymentExpiresAt) }

    val transitioned = stringRedisTemplate.execute(
      transitionForPaymentScript,
      keys,
      activeHoldData.holdVenueSeatEntries.size.toString(),
      activeHoldData.holdDetails.size.toString(),
      paymentExpiresAt.toEpochMillis().toString(),
      *activeHoldData.holdVenueSeatEntries.map { it.holdId }.toTypedArray(),
      *activeHoldData.storedHoldDetailJsons.toTypedArray(),
      *transitionedHoldDetails.map { objectMapper.writeValueAsString(it) }.toTypedArray(),
      *transitionedHoldDetails.map { it.holdId }.toTypedArray(),
    ) == 0L

    if (!transitioned) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 결제 전환을 할 수 없습니다.")
    }

    return transitionedHoldDetails
  }

  fun releaseAllVenueSeats(groupId: String): List<Long> {
    val activeHoldData = findActiveHoldDataByGroupId(groupId)

    val keys = activeHoldData.holdVenueSeatEntries.map { it.key } +
      activeHoldData.holdDetailKeys +
      activeHoldData.holdGroupKey

    val released = stringRedisTemplate.execute(
      releaseAllVenueSeatsScript,
      keys,
      activeHoldData.holdVenueSeatEntries.size.toString(),
      activeHoldData.holdDetails.size.toString(),
      *activeHoldData.holdVenueSeatEntries.map { it.holdId }.toTypedArray(),
      *activeHoldData.storedHoldDetailJsons.toTypedArray(),
    ) == 0L

    if (!released) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 해제할 수 없습니다.")
    }

    return activeHoldData.holdVenueSeatEntries.map { it.venueSeatId }
  }

  fun releaseVenueSeats(holdId: String, groupId: String, performanceId: Long, venueSeatIds: List<Long>, eventId: UUID): OutboxHoldActionResult {
    validateVenueSeatIds(venueSeatIds)

    val keys = venueSeatIds.map { holdVenueSeatKey(performanceId, it) } +
      holdDetailKey(holdId) +
      holdGroupKey(groupId) +
      outboxHoldActionKey(eventId)
    val result = stringRedisTemplate.execute(
      releaseHoldByIdScript,
      keys,
      holdId,
      venueSeatIds.size.toString(),
    ) ?: throw IllegalStateException("Hold 해제 결과를 확인하지 못했습니다.")

    return when (result) {
      0L -> OutboxHoldActionResult.APPLIED
      1L -> OutboxHoldActionResult.REPLACED
      2L -> OutboxHoldActionResult.EXPIRED
      3L -> OutboxHoldActionResult.ALREADY_APPLIED
      else -> throw IllegalStateException("알 수 없는 Hold 해제 결과입니다: $result")
    }
  }

  fun finalizeVenueSeats(holdId: String, groupId: String, performanceId: Long, venueSeatIds: List<Long>): OutboxHoldActionResult {
    validateVenueSeatIds(venueSeatIds)

    val finalizingKeys = venueSeatIds.map { finalizingVenueSeatKey(performanceId, it) }
    val keys = venueSeatIds.map { holdVenueSeatKey(performanceId, it) } +
      finalizingKeys +
      holdDetailKey(holdId) +
      holdGroupKey(groupId)
    val result = stringRedisTemplate.execute(
      finalizeHoldByIdScript,
      keys,
      holdId,
      venueSeatIds.size.toString(),
    ) ?: throw IllegalStateException("Hold 확정 결과를 확인하지 못했습니다.")

    return when (result) {
      0L -> OutboxHoldActionResult.APPLIED
      1L -> OutboxHoldActionResult.REPLACED
      2L -> OutboxHoldActionResult.ALREADY_APPLIED
      else -> throw IllegalStateException("알 수 없는 Hold 확정 결과입니다: $result")
    }
  }

  fun findActiveHoldDataByGroupId(groupId: String): ActiveHoldData {
    val holdGroupKey = holdGroupKey(groupId)
    val holdIds = stringRedisTemplate.opsForZSet()
      .rangeByScore(holdGroupKey, (System.currentTimeMillis() + 1).toDouble(), Double.POSITIVE_INFINITY)
      .toList()
    if (holdIds.isEmpty()) throw CustomException(ErrorCode.NOT_FOUND, "점유된 좌석이 존재하지 않습니다.")

    val holdDetailKeys = holdIds.map { holdDetailKey(it) }
    val storedHoldDetailJsons = stringRedisTemplate.opsForValue().multiGet(holdDetailKeys)
      .map { it ?: throw CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "좌석 점유 정보가 일치하지 않습니다.") }
    val holdDetails = storedHoldDetailJsons.map { objectMapper.readValue(it, VenueSeatHoldDetail::class.java) }

    val holdVenueSeatEntries = holdDetails.flatMap { holdDetail ->
      holdDetail.venueSeatIds.map { venueSeatId ->
        HoldVenueSeatEntry(
          key = holdVenueSeatKey(holdDetail.performanceId, venueSeatId),
          holdId = holdDetail.holdId,
          venueSeatId = venueSeatId,
        )
      }
    }
    return ActiveHoldData(
      groupId = groupId,
      performanceId = holdDetails.first().performanceId,
      holdGroupKey = holdGroupKey,
      storedHoldDetailJsons = storedHoldDetailJsons,
      holdDetailKeys = holdDetailKeys,
      holdDetails = holdDetails,
      holdVenueSeatEntries = holdVenueSeatEntries,
    )
  }

  fun getGroupId(userId: Long, performanceId: Long): String {
    // 추후 사용자 ID를 기반으로 그룹 ID를 가져오는 로직 구현 필요
    // 현재는 단순히 사용자 ID를 문자열로 변환하여 그룹 ID로 사용
    return "$userId:$performanceId"
  }

  private fun findHeldSeatsByPerformanceId(performanceId: Long): List<HeldSeat> {
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

  private fun validateVenueSeatIds(venueSeatIds: List<Long>) {
    if (venueSeatIds.isEmpty() || venueSeatIds.any { it <= 0 }) {
      throw CustomException(ErrorCode.BAD_REQUEST, "좌석 ID는 한 개 이상의 양수여야 합니다.")
    }
    if (venueSeatIds.distinct().size != venueSeatIds.size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 좌석 ID가 포함되어 있습니다.")
    }
  }

  private fun ensureHoldModificationAllowed(groupId: String) {
    val reservation = reservationRepository.findByGroupIdForUpdate(groupId)
    if (reservation != null) {
      throw CustomException(ErrorCode.CONFLICT, "결제 대기 이후에는 좌석을 변경할 수 없습니다.")
    }
  }

  private fun holdGroupKey(groupId: String) = "$HOLD_GROUP_KEY_PREFIX$groupId"
  private fun holdDetailKey(holdId: String) = "$HOLD_DETAIL_KEY_PREFIX$holdId"
  private fun holdVenueSeatKey(performanceId: Long, venueSeatId: Long) = "$HOLD_VENUE_SEAT_KEY_PREFIX$performanceId:$venueSeatId"
  private fun finalizingVenueSeatKey(performanceId: Long, venueSeatId: Long) = "$FINALIZING_VENUE_SEAT_KEY_PREFIX$performanceId:$venueSeatId"
  private fun outboxHoldActionKey(eventId: UUID) = "$OUTBOX_HOLD_ACTION_KEY_PREFIX$eventId"

  private fun LocalDateTime.toEpochMillis(): Long = atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

  companion object {
    private val SEAT_HOLD_TTL = Duration.ofMinutes(5)

    private const val HOLD_GROUP_KEY_PREFIX = "hold:group:"
    private const val HOLD_DETAIL_KEY_PREFIX = "hold:detail:"
    private const val HOLD_VENUE_SEAT_KEY_PREFIX = "hold:venue-seat:"
    private const val FINALIZING_VENUE_SEAT_KEY_PREFIX = "hold:venue-seat-finalizing:"
    private const val OUTBOX_HOLD_ACTION_KEY_PREFIX = "hold:outbox-action:"

    private val holdVenueSeatsScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/hold-venue-seats.lua"))
      resultType = Long::class.java
    }

    private val getMyHeldSeatsScript = DefaultRedisScript<String>().apply {
      setLocation(ClassPathResource("redis/get-my-held-seats.lua"))
      resultType = String::class.java
    }

    private val releaseVenueSeatsScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/release-venue-seats.lua"))
      resultType = Long::class.java
    }

    private val transitionForPaymentScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/transition-for-payment.lua"))
      resultType = Long::class.java
    }

    private val releaseAllVenueSeatsScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/release-all-venue-seats.lua"))
      resultType = Long::class.java
    }

    private val releaseHoldByIdScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/release-hold-by-id.lua"))
      resultType = Long::class.java
    }

    private val finalizeHoldByIdScript = DefaultRedisScript<Long>().apply {
      setLocation(ClassPathResource("redis/finalize-hold-by-id.lua"))
      resultType = Long::class.java
    }
  }
}

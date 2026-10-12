package com.example.server.performance

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.GroupService
import com.example.server.outbox.types.OutboxHoldActionResult
import com.example.server.performance.dto.ActiveHoldData
import com.example.server.performance.dto.HoldVenueSeatEntry
import com.example.server.performance.dto.PerformanceHeldSeatsEvent
import com.example.server.performance.dto.PerformanceSeatStatusMessageData
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.performance.dto.VenueSeatHoldDetail.VenueSeatHoldPhase
import com.example.server.performance.dto.VenueSeatHoldSummary
import com.example.server.performance.dto.reviewedBy
import com.example.server.performance.dto.toSummary
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.performance.types.VenueSeatHoldRedisDefinitions
import com.example.server.performance.types.VenueSeatHoldScope
import com.example.server.reservation.PersonalPaymentCancellationService
import com.example.server.reservation.dto.BeginCheckoutReviewMessageData
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.repository.VenueSeatRepository
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class RedisVenueSeatHoldService(
  private val performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher,
  private val groupService: GroupService,
  private val performanceRepository: PerformanceRepository,
  private val venueSeatRepository: VenueSeatRepository,
  private val reservationSeatRepository: ReservationSeatRepository,
  private val reservationRepository: ReservationRepository,
  private val stringRedisTemplate: StringRedisTemplate,
  private val objectMapper: ObjectMapper,
  private val personalPaymentCancellationService: PersonalPaymentCancellationService,
) {
  @Transactional(readOnly = true)
  fun getSeatStatus(userId: Long, performanceId: Long): PerformanceSeatStatusMessageData {
    performanceRepository.findById(performanceId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.") }

    repeat(3) {
      val beforeVersion = getCurrentVersion(performanceId)
      val bookedSeatIds = reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = performanceId,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      )
      val otherHeldSeats = findOtherHeldSeats(userId, performanceId)
      val myHolds = findMyHolds(userId, performanceId)
      val afterVersion = getCurrentVersion(performanceId)

      if (beforeVersion == afterVersion) {
        return PerformanceSeatStatusMessageData(
          version = afterVersion,
          serverTime = LocalDateTime.now(),
          bookedSeatIds = bookedSeatIds,
          otherHoldSeats = otherHeldSeats,
          myHolds = myHolds,
        )
      }
    }

    throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 조회를 다시 시도해야 합니다.")
  }

  fun beginCheckoutReview(scopeId: String, performanceId: Long, reviewToken: UUID): BeginCheckoutReviewMessageData {
    val result = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.beginCheckoutReviewScript,
      listOf(
        VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId),
        VenueSeatHoldRedisDefinitions.versionKey(performanceId),
      ),
      VenueSeatHoldRedisDefinitions.HOLD_DETAIL_KEY_PREFIX,
      "${VenueSeatHoldRedisDefinitions.HOLD_VENUE_SEAT_KEY_PREFIX}$performanceId:",
      scopeId,
      performanceId.toString(),
      reviewToken.toString(),
    ) ?: throw IllegalStateException("예매 정보 확인 결과를 확인하지 못했습니다.")

    when (result) {
      "NOT_FOUND" -> throw CustomException(ErrorCode.CONFLICT, "좌석 점유가 만료되었습니다.")
      "CONFLICT" -> throw CustomException(ErrorCode.CONFLICT, "다른 예매 정보 확인 또는 결제가 진행 중입니다.")
    }

    val snapshot = objectMapper.readValue(result, CheckoutReviewSnapshot::class.java)
    performanceVenueSeatStompPublisher.publishSeatStatusChanged(
      performanceId = snapshot.performanceId,
      version = snapshot.version,
    )
    return BeginCheckoutReviewMessageData(
      scopeId = snapshot.scopeId,
      performanceId = snapshot.performanceId,
      venueSeatIds = snapshot.venueSeatIds,
      expiresAt = LocalDateTime.ofInstant(Instant.ofEpochMilli(snapshot.expiresAtEpochMillis), ZoneId.systemDefault()),
      reviewToken = snapshot.reviewToken,
    )
  }

  fun endCheckoutReview(scopeId: String, performanceId: Long, reviewToken: UUID): Boolean {
    val result = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.endCheckoutReviewScript,
      listOf(
        VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId),
        VenueSeatHoldRedisDefinitions.versionKey(performanceId),
      ),
      reviewToken.toString(),
      VenueSeatHoldRedisDefinitions.HOLD_DETAIL_KEY_PREFIX,
    ) ?: return false

    if (result < 0L) return false

    performanceVenueSeatStompPublisher.publishSeatStatusChanged(performanceId, result)
    return true
  }

  @Transactional
  fun holdSeats(userId: Long, performanceId: Long, venueSeatIds: List<Long>): VenueSeatHoldSummary {
    validateVenueSeatIds(venueSeatIds)

    val scopeId = getScopeId(userId, performanceId)
    val groupId = VenueSeatHoldScope.getGroupId(scopeId)
    personalPaymentCancellationService.cancelPersonalPaymentPending(scopeId, userId, performanceId)
    ensureHoldModificationAllowed(groupId, userId, performanceId)

    val performance = performanceRepository.findByIdWithConcertAndVenue(performanceId)
      ?: throw CustomException(ErrorCode.NOT_FOUND, "공연 회차를 찾을 수 없습니다.")

    val venueSeats = venueSeatRepository.findAllByVenueIdAndIdIn(performance.concert.venue.id, venueSeatIds)
    if (venueSeats.size != venueSeatIds.size) {
      throw CustomException(ErrorCode.NOT_FOUND, "공연장 좌석을 찾을 수 없습니다.")
    }

    if (
      reservationSeatRepository.existsByPerformanceIdAndVenueSeatIdInAndReservationStatusIn(
        performanceId = performanceId,
        venueSeatIds = venueSeatIds,
        statuses = ReservationStatus.BOOKED_SEAT_STATUSES,
      )
    ) {
      throw CustomException(ErrorCode.CONFLICT, "이미 예매된 좌석이 포함되어 있습니다.")
    }

    val createdAtEpochMillis = System.currentTimeMillis()
    val holdDetail = VenueSeatHoldDetail(
      holdId = UUID.randomUUID().toString(),
      scopeId = scopeId,
      performanceId = performanceId,
      venueSeatIds = venueSeatIds,
      expiresAt = LocalDateTime.ofInstant(Instant.ofEpochMilli(createdAtEpochMillis), ZoneId.systemDefault())
        .plus(VenueSeatHoldRedisDefinitions.seatHoldTtl)
        .truncatedTo(ChronoUnit.MILLIS),
    )

    val venueSeatKeys = holdDetail.venueSeatIds.map { VenueSeatHoldRedisDefinitions.holdVenueSeatKey(holdDetail.performanceId, it) }
    val finalizingVenueSeatKeys = holdDetail.venueSeatIds.map { VenueSeatHoldRedisDefinitions.finalizingVenueSeatKey(holdDetail.performanceId, it) }
    val keys = venueSeatKeys + finalizingVenueSeatKeys +
      listOf(
        VenueSeatHoldRedisDefinitions.holdDetailKey(holdDetail.holdId),
        VenueSeatHoldRedisDefinitions.holdExpiryKey(holdDetail.holdId),
        VenueSeatHoldRedisDefinitions.holdPerformanceKey(holdDetail.performanceId),
        VenueSeatHoldRedisDefinitions.holdScopeKey(holdDetail.scopeId),
        VenueSeatHoldRedisDefinitions.versionKey(holdDetail.performanceId),
        VenueSeatHoldRedisDefinitions.holdCreatedAtKey(holdDetail.holdId),
      )

    val mutation = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.holdSeatsScript,
      keys,
      holdDetail.holdId,
      holdDetail.expiresAt.toEpochMillis().toString(),
      objectMapper.writeValueAsString(holdDetail),
      venueSeatKeys.size.toString(),
      createdAtEpochMillis.toString(),
      VenueSeatHoldRedisDefinitions.HOLD_DETAIL_KEY_PREFIX,
      scopeId,
      performanceId.toString(),
      VenueSeatHoldScope.isPersonal(scopeId).toString(),
    )?.let(::parseMutationResult)

    if (mutation?.code != 0L) {
      throw CustomException(ErrorCode.CONFLICT, "이미 점유된 좌석이 포함되어 있습니다.")
    }

    performanceVenueSeatStompPublisher.publishHeldSeats(
      performanceId,
      holdDetail.venueSeatIds.map {
        PerformanceHeldSeatsEvent.HeldSeat(id = it, expiresAt = holdDetail.expiresAt)
      },
      version = mutation.version,
    )

    return holdDetail.toSummary()
  }

  @Transactional
  fun releaseSeats(userId: Long, performanceId: Long, venueSeatIds: List<Long>): List<Long> {
    validateVenueSeatIds(venueSeatIds)

    val scopeId = getScopeId(userId, performanceId)
    val groupId = VenueSeatHoldScope.getGroupId(scopeId)
    personalPaymentCancellationService.cancelPersonalPaymentPending(scopeId, userId, performanceId)
    ensureHoldModificationAllowed(groupId, userId, performanceId)

    val venueSeatKeys = venueSeatIds.map { VenueSeatHoldRedisDefinitions.holdVenueSeatKey(performanceId, it) }
    val holdIds = stringRedisTemplate.opsForValue().multiGet(venueSeatKeys)
      .map { it ?: throw CustomException(ErrorCode.NOT_FOUND, "점유되지 않은 좌석이 포함되어 있습니다.") }

    val seatIdsByHoldId = venueSeatIds
      .zip(holdIds)
      .groupBy(keySelector = { (_, holdId) -> holdId }, valueTransform = { (venueSeatId, _) -> venueSeatId })
      .mapValues { (_, seatIds) -> seatIds.toSet() }

    val holdDetailKeys = seatIdsByHoldId.keys.map { VenueSeatHoldRedisDefinitions.holdDetailKey(it) }
    val storedHoldDetails = stringRedisTemplate.opsForValue().multiGet(holdDetailKeys)
      .map { it ?: throw CustomException(ErrorCode.NOT_FOUND, "좌석 점유 정보를 찾을 수 없습니다.") }
    val holdDetails = storedHoldDetails.map { value ->
      objectMapper.readValue(value, VenueSeatHoldDetail::class.java)
        .also {
          if (it.scopeId != scopeId || it.phase != VenueSeatHoldPhase.HOLDING) {
            throw CustomException(ErrorCode.FORBIDDEN, "홀드에 대한 권한이 없습니다.")
          }
        }
    }

    val updatedHoldDetails = holdDetails.map { holdDetail ->
      val seatIds = seatIdsByHoldId.getValue(holdDetail.holdId)
      holdDetail.copy(venueSeatIds = holdDetail.venueSeatIds.filterNot { it in seatIds })
    }

    val (emptyHoldDetails, remainingHoldDetails) = storedHoldDetails.zip(updatedHoldDetails).partition { (_, updated) ->
      updated.venueSeatIds.isEmpty()
    }

    val keys = venueSeatKeys +
      emptyHoldDetails.map { (_, updated) -> VenueSeatHoldRedisDefinitions.holdDetailKey(updated.holdId) } +
      remainingHoldDetails.map { (_, updated) -> VenueSeatHoldRedisDefinitions.holdDetailKey(updated.holdId) } +
      emptyHoldDetails.map { (_, updated) -> VenueSeatHoldRedisDefinitions.holdExpiryKey(updated.holdId) } +
      listOf(
        VenueSeatHoldRedisDefinitions.holdPerformanceKey(performanceId),
        VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId),
        VenueSeatHoldRedisDefinitions.versionKey(performanceId),
      )

    val mutation = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.releaseSeatsScript,
      keys,
      venueSeatKeys.size.toString(),
      emptyHoldDetails.size.toString(),
      remainingHoldDetails.size.toString(),
      *holdIds.toTypedArray(),
      *(emptyHoldDetails + remainingHoldDetails).map { (stored, _) -> stored }.toTypedArray(),
      *emptyHoldDetails.map { (_, updated) -> updated.holdId }.toTypedArray(),
      *remainingHoldDetails.map { (_, updated) -> objectMapper.writeValueAsString(updated) }.toTypedArray(),
    )?.let(::parseMutationResult)

    if (mutation?.code != 0L) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 해제할 수 없습니다.")
    }

    performanceVenueSeatStompPublisher.publishReleasedSeats(performanceId, venueSeatIds, version = mutation.version)
    return venueSeatIds
  }

  fun transitionForPayment(scopeId: String, paymentExpiresAt: LocalDateTime, reviewToken: UUID, reservationId: Long): List<VenueSeatHoldDetail> {
    val activeHoldData = findActiveHoldDataByScopeId(scopeId)
      .reviewedBy(reviewToken)
      ?: throw CustomException(ErrorCode.CONFLICT, "예매 정보 확인이 만료되었거나 변경되었습니다.")

    val keys = activeHoldData.holdVenueSeatEntries.map { it.key } + activeHoldData.holdDetailKeys +
      activeHoldData.holdDetails.map { VenueSeatHoldRedisDefinitions.holdExpiryKey(it.holdId) } +
      listOf(
        VenueSeatHoldRedisDefinitions.holdPerformanceKey(activeHoldData.performanceId),
        activeHoldData.holdScopeKey,
        VenueSeatHoldRedisDefinitions.versionKey(activeHoldData.performanceId),
      )

    val transitionedHoldDetails = activeHoldData.holdDetails.map {
      it.copy(
        expiresAt = paymentExpiresAt,
        phase = VenueSeatHoldPhase.PAYMENT,
        reviewToken = null,
        reservationId = reservationId,
      )
    }

    val mutation = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.transitionForPaymentScript,
      keys,
      activeHoldData.holdVenueSeatEntries.size.toString(),
      activeHoldData.holdDetails.size.toString(),
      paymentExpiresAt.toEpochMillis().toString(),
      *activeHoldData.holdVenueSeatEntries.map { it.holdId }.toTypedArray(),
      *activeHoldData.storedHoldDetailJsons.toTypedArray(),
      *transitionedHoldDetails.map { objectMapper.writeValueAsString(it) }.toTypedArray(),
      *transitionedHoldDetails.map { it.holdId }.toTypedArray(),
    )?.let(::parseMutationResult)

    if (mutation?.code != 0L) {
      throw CustomException(ErrorCode.CONFLICT, "좌석 점유 상태가 변경되어 결제 전환을 할 수 없습니다.")
    }

    performanceVenueSeatStompPublisher.publishSeatStatusChanged(
      performanceId = activeHoldData.performanceId,
      version = mutation.version,
    )

    return transitionedHoldDetails
  }

  fun publishExpiredHold(holdId: String) {
    val storedHoldDetail = stringRedisTemplate.opsForValue().get(VenueSeatHoldRedisDefinitions.holdDetailKey(holdId)) ?: return
    val holdDetail = objectMapper.readValue(storedHoldDetail, VenueSeatHoldDetail::class.java)
    val resultJson = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.expireHoldScript,
      holdDetail.venueSeatIds.map { VenueSeatHoldRedisDefinitions.holdVenueSeatKey(holdDetail.performanceId, it) } +
        listOf(
          VenueSeatHoldRedisDefinitions.holdDetailKey(holdId),
          VenueSeatHoldRedisDefinitions.holdPerformanceKey(holdDetail.performanceId),
          VenueSeatHoldRedisDefinitions.holdScopeKey(holdDetail.scopeId),
          VenueSeatHoldRedisDefinitions.versionKey(holdDetail.performanceId),
        ),
      holdId,
      storedHoldDetail,
      System.currentTimeMillis().toString(),
      holdDetail.venueSeatIds.size.toString(),
      *holdDetail.venueSeatIds.map(Long::toString).toTypedArray(),
    ) ?: return
    val result = objectMapper.readValue(resultJson, ExpiredHoldResult::class.java)

    performanceVenueSeatStompPublisher.publishReleasedSeats(
      performanceId = holdDetail.performanceId,
      venueSeatIds = result.venueSeatIds,
      version = result.version,
    )
  }

  fun releaseVenueSeats(holdId: String, scopeId: String, performanceId: Long, venueSeatIds: List<Long>, eventId: UUID): VenueSeatHoldActionResult {
    validateVenueSeatIds(venueSeatIds)

    val keys = venueSeatIds.map { VenueSeatHoldRedisDefinitions.holdVenueSeatKey(performanceId, it) } +
      listOf(
        VenueSeatHoldRedisDefinitions.holdDetailKey(holdId),
        VenueSeatHoldRedisDefinitions.holdExpiryKey(holdId),
        VenueSeatHoldRedisDefinitions.holdPerformanceKey(performanceId),
        VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId),
        VenueSeatHoldRedisDefinitions.outboxHoldActionKey(eventId),
        VenueSeatHoldRedisDefinitions.versionKey(performanceId),
      )
    val mutation = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.releaseHoldByIdScript,
      keys,
      holdId,
      venueSeatIds.size.toString(),
    )?.let(::parseMutationResult) ?: throw IllegalStateException("Hold 해제 결과를 확인하지 못했습니다.")

    return when (mutation.code) {
      0L -> VenueSeatHoldActionResult(OutboxHoldActionResult.APPLIED, mutation.version)
      1L -> VenueSeatHoldActionResult(OutboxHoldActionResult.REPLACED, mutation.version)
      2L -> VenueSeatHoldActionResult(OutboxHoldActionResult.EXPIRED, mutation.version)
      3L -> VenueSeatHoldActionResult(OutboxHoldActionResult.ALREADY_APPLIED, mutation.version)
      else -> throw IllegalStateException("알 수 없는 Hold 해제 결과입니다: ${mutation.code}")
    }
  }

  fun finalizeVenueSeats(holdId: String, scopeId: String, performanceId: Long, venueSeatIds: List<Long>, eventId: UUID): VenueSeatHoldActionResult {
    validateVenueSeatIds(venueSeatIds)

    val finalizingKeys = venueSeatIds.map { VenueSeatHoldRedisDefinitions.finalizingVenueSeatKey(performanceId, it) }
    val keys = venueSeatIds.map { VenueSeatHoldRedisDefinitions.holdVenueSeatKey(performanceId, it) } + finalizingKeys +
      listOf(
        VenueSeatHoldRedisDefinitions.holdDetailKey(holdId),
        VenueSeatHoldRedisDefinitions.holdExpiryKey(holdId),
        VenueSeatHoldRedisDefinitions.holdPerformanceKey(performanceId),
        VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId),
        VenueSeatHoldRedisDefinitions.outboxHoldActionKey(eventId),
        VenueSeatHoldRedisDefinitions.versionKey(performanceId),
      )
    val mutation = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.finalizeHoldByIdScript,
      keys,
      holdId,
      venueSeatIds.size.toString(),
    )?.let(::parseMutationResult) ?: throw IllegalStateException("Hold 확정 결과를 확인하지 못했습니다.")

    return when (mutation.code) {
      0L -> VenueSeatHoldActionResult(OutboxHoldActionResult.APPLIED, mutation.version)
      1L -> VenueSeatHoldActionResult(OutboxHoldActionResult.REPLACED, mutation.version)
      2L -> VenueSeatHoldActionResult(OutboxHoldActionResult.ALREADY_APPLIED, mutation.version)
      else -> throw IllegalStateException("알 수 없는 Hold 확정 결과입니다: ${mutation.code}")
    }
  }

  fun releaseCancelledReservationSeats(
    scopeId: String,
    performanceId: Long,
    venueSeatIds: List<Long>,
    cancelledAtEpochMillis: Long,
    eventId: UUID,
  ): CancelledReservationSeatReleaseResult {
    validateVenueSeatIds(venueSeatIds)

    val keys = venueSeatIds.map { VenueSeatHoldRedisDefinitions.holdVenueSeatKey(performanceId, it) } +
      venueSeatIds.map { VenueSeatHoldRedisDefinitions.finalizingVenueSeatKey(performanceId, it) } +
      listOf(VenueSeatHoldRedisDefinitions.outboxHoldActionKey(eventId), VenueSeatHoldRedisDefinitions.versionKey(performanceId))
    val result = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.releaseCancelledReservationSeatsScript,
      keys,
      venueSeatIds.size.toString(),
      scopeId,
      cancelledAtEpochMillis.toString(),
      VenueSeatHoldRedisDefinitions.HOLD_DETAIL_KEY_PREFIX,
      VenueSeatHoldRedisDefinitions.HOLD_CREATED_AT_KEY_PREFIX,
      VenueSeatHoldRedisDefinitions.HOLD_EXPIRY_KEY_PREFIX,
      VenueSeatHoldRedisDefinitions.holdPerformanceKey(performanceId),
      VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId),
      "${VenueSeatHoldRedisDefinitions.HOLD_VENUE_SEAT_KEY_PREFIX}$performanceId:",
      "${VenueSeatHoldRedisDefinitions.FINALIZING_VENUE_SEAT_KEY_PREFIX}$performanceId:",
      *venueSeatIds.map(Long::toString).toTypedArray(),
    ) ?: throw IllegalStateException("환불 좌석 해제 결과를 확인하지 못했습니다.")

    val values = result.split(":", limit = 2)
    if (values.size != 2) throw IllegalStateException("환불 좌석 해제 결과 형식이 올바르지 않습니다.")

    val code = values[0].toLongOrNull() ?: throw IllegalStateException("환불 좌석 해제 결과 코드가 올바르지 않습니다.")
    val action = when (code) {
      0L -> OutboxHoldActionResult.APPLIED
      3L -> OutboxHoldActionResult.ALREADY_APPLIED
      else -> throw IllegalStateException("알 수 없는 환불 좌석 해제 결과입니다: $code")
    }

    val marker = values[1].split("|", limit = 2)
    if (marker.size != 2) throw IllegalStateException("환불 좌석 해제 결과 값이 올바르지 않습니다.")

    val version = marker[0].toLongOrNull() ?: throw IllegalStateException("환불 좌석 해제 버전이 올바르지 않습니다.")
    val releasedVenueSeatIds = marker[1]
      .split(",")
      .filter(String::isNotBlank)
      .map { it.toLongOrNull() ?: throw IllegalStateException("환불 좌석 ID가 올바르지 않습니다.") }

    return CancelledReservationSeatReleaseResult(action, version, releasedVenueSeatIds)
  }

  fun findActiveHoldDataByScopeId(scopeId: String): ActiveHoldData {
    val holdScopeKey = VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId)
    val holdIds = stringRedisTemplate.opsForZSet()
      .rangeByScore(holdScopeKey, (System.currentTimeMillis() + 1).toDouble(), Double.POSITIVE_INFINITY)
      .toList()
    if (holdIds.isEmpty()) throw CustomException(ErrorCode.NOT_FOUND, "점유된 좌석이 존재하지 않습니다.")

    val holdDetailKeys = holdIds.map { VenueSeatHoldRedisDefinitions.holdDetailKey(it) }
    val storedHoldDetailJsons = stringRedisTemplate.opsForValue().multiGet(holdDetailKeys)
      .map { it ?: throw CustomException(ErrorCode.INTERNAL_SERVER_ERROR, "좌석 점유 정보가 일치하지 않습니다.") }
    val holdDetails = storedHoldDetailJsons.map { objectMapper.readValue(it, VenueSeatHoldDetail::class.java) }

    val holdVenueSeatEntries = holdDetails.flatMap { holdDetail ->
      holdDetail.venueSeatIds.map { venueSeatId ->
        HoldVenueSeatEntry(
          key = VenueSeatHoldRedisDefinitions.holdVenueSeatKey(holdDetail.performanceId, venueSeatId),
          holdId = holdDetail.holdId,
          venueSeatId = venueSeatId,
        )
      }
    }

    return ActiveHoldData(
      scopeId = scopeId,
      performanceId = holdDetails.first().performanceId,
      holdScopeKey = holdScopeKey,
      storedHoldDetailJsons = storedHoldDetailJsons,
      holdDetailKeys = holdDetailKeys,
      holdDetails = holdDetails,
      holdVenueSeatEntries = holdVenueSeatEntries,
    )
  }

  fun getScopeId(userId: Long, performanceId: Long): String {
    val groupId = groupService.getGroupId(userId, performanceId)
    return VenueSeatHoldScope.id(groupId, userId, performanceId)
  }

  private fun findOtherHeldSeats(userId: Long, performanceId: Long): List<PerformanceSeatStatusMessageData.HeldSeat> {
    val scopeId = getScopeId(userId, performanceId)

    val now = LocalDateTime.now()
    val holdIds = stringRedisTemplate.opsForZSet()
      .rangeByScore(
        VenueSeatHoldRedisDefinitions.holdPerformanceKey(performanceId),
        (System.currentTimeMillis() + 1).toDouble(),
        Double.POSITIVE_INFINITY,
      )
      .orEmpty()

    val otherHoldDetails = holdIds
      .mapNotNull { holdId ->
        stringRedisTemplate.opsForValue().get(VenueSeatHoldRedisDefinitions.holdDetailKey(holdId))?.let {
          objectMapper.readValue(it, VenueSeatHoldDetail::class.java)
        }
      }
      .filter {
        it.expiresAt.isAfter(now) &&
          (
            it.scopeId != scopeId ||
              it.phase == VenueSeatHoldPhase.REVIEW ||
              it.phase == VenueSeatHoldPhase.PAYMENT ||
              it.phase == VenueSeatHoldPhase.SUPERSEDED
            )
      }

    return otherHoldDetails
      .flatMap { hold ->
        hold.venueSeatIds.map { PerformanceSeatStatusMessageData.HeldSeat(id = it, expiresAt = hold.expiresAt) }
      }
  }

  private fun findMyHolds(userId: Long, performanceId: Long): List<VenueSeatHoldSummary> {
    val scopeId = getScopeId(userId, performanceId)
    val groupId = VenueSeatHoldScope.getGroupId(scopeId)

    if (reservationRepository.existsPaymentInProgressByScope(
        groupId,
        userId,
        performanceId,
        ReservationStatus.PAYMENT_IN_PROGRESS_STATUSES,
      )
    ) {
      return emptyList()
    }

    val keys = listOf(VenueSeatHoldRedisDefinitions.holdScopeKey(scopeId))
    val heldSeatsJson = stringRedisTemplate.execute(
      VenueSeatHoldRedisDefinitions.getMyHoldsScript,
      keys,
      VenueSeatHoldRedisDefinitions.HOLD_DETAIL_KEY_PREFIX,
    )

    return objectMapper
      .readValue(heldSeatsJson, Array<VenueSeatHoldDetail>::class.java)
      .toList().map { it.toSummary() }
  }

  private fun validateVenueSeatIds(venueSeatIds: List<Long>) {
    if (venueSeatIds.isEmpty() || venueSeatIds.any { it <= 0 }) {
      throw CustomException(ErrorCode.BAD_REQUEST, "좌석 ID는 한 개 이상의 양수여야 합니다.")
    }
    if (venueSeatIds.distinct().size != venueSeatIds.size) {
      throw CustomException(ErrorCode.BAD_REQUEST, "중복된 좌석 ID가 포함되어 있습니다.")
    }
  }

  private fun ensureHoldModificationAllowed(groupId: Long?, userId: Long, performanceId: Long) {
    val blockingStatuses = if (groupId == null) {
      listOf(ReservationStatus.PAYMENT_CONFIRMING)
    } else {
      ReservationStatus.PAYMENT_IN_PROGRESS_STATUSES
    }

    reservationRepository.findPaymentInProgressByScopeForUpdate(
      groupId = groupId,
      bookerUserId = userId,
      performanceId = performanceId,
      statuses = blockingStatuses,
    ) ?: return

    throw CustomException(ErrorCode.CONFLICT, "결제가 진행 중인 동안에는 좌석을 변경할 수 없습니다.")
  }

  private fun parseMutationResult(result: String): RedisMutationResult? {
    val values = result.split(":", limit = 2)
    if (values.size != 2) return null

    return RedisMutationResult(
      code = values[0].toLongOrNull() ?: return null,
      version = values[1].toLongOrNull() ?: return null,
    )
  }

  private fun getCurrentVersion(performanceId: Long): Long {
    val versionKey = VenueSeatHoldRedisDefinitions.versionKey(performanceId)
    val versionString = stringRedisTemplate.opsForValue().get(versionKey)
    return versionString?.toLongOrNull() ?: 0L
  }

  private fun LocalDateTime.toEpochMillis(): Long = atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()

  private data class RedisMutationResult(val code: Long, val version: Long)
  private data class ExpiredHoldResult(val version: Long, val venueSeatIds: List<Long>)
  private data class CheckoutReviewSnapshot(
    val phase: String,
    val scopeId: String,
    val performanceId: Long,
    val holdIds: List<String>,
    val venueSeatIds: List<Long>,
    val expiresAtEpochMillis: Long,
    val reviewToken: UUID,
    val version: Long,
  )

  data class VenueSeatHoldActionResult(val action: OutboxHoldActionResult, val version: Long)
  data class CancelledReservationSeatReleaseResult(val action: OutboxHoldActionResult, val version: Long, val releasedVenueSeatIds: List<Long>)
}

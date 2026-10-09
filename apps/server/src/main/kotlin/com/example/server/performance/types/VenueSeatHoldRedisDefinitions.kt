package com.example.server.performance.types

import org.springframework.core.io.ClassPathResource
import org.springframework.data.redis.core.script.DefaultRedisScript
import java.time.Duration
import java.util.UUID

internal object VenueSeatHoldRedisDefinitions {
  fun holdPerformanceKey(performanceId: Long) = "$HOLD_PERFORMANCE_KEY_PREFIX$performanceId"
  fun holdExpiryKey(holdId: String) = "$HOLD_EXPIRY_KEY_PREFIX$holdId"
  fun versionKey(performanceId: Long) = "$VERSION_KEY_PREFIX$performanceId"
  fun holdScopeKey(scopeId: String) = "$HOLD_SCOPE_KEY_PREFIX$scopeId"
  fun holdDetailKey(holdId: String) = "$HOLD_DETAIL_KEY_PREFIX$holdId"
  fun holdCreatedAtKey(holdId: String) = "$HOLD_CREATED_AT_KEY_PREFIX$holdId"
  fun holdVenueSeatKey(performanceId: Long, venueSeatId: Long) = "$HOLD_VENUE_SEAT_KEY_PREFIX$performanceId:$venueSeatId"
  fun finalizingVenueSeatKey(performanceId: Long, venueSeatId: Long) = "$FINALIZING_VENUE_SEAT_KEY_PREFIX$performanceId:$venueSeatId"
  fun outboxHoldActionKey(eventId: UUID) = "$OUTBOX_HOLD_ACTION_KEY_PREFIX$eventId"

  val seatHoldTtl: Duration = Duration.ofMinutes(5)

  const val HOLD_PERFORMANCE_KEY_PREFIX = "hold:performance:"
  const val HOLD_EXPIRY_KEY_PREFIX = "hold:expiry:"
  const val HOLD_SCOPE_KEY_PREFIX = "hold:scope:"
  const val HOLD_DETAIL_KEY_PREFIX = "hold:detail:"
  const val HOLD_CREATED_AT_KEY_PREFIX = "hold:created-at:"
  const val HOLD_VENUE_SEAT_KEY_PREFIX = "hold:venue-seat:"
  const val FINALIZING_VENUE_SEAT_KEY_PREFIX = "hold:venue-seat-finalizing:"
  const val OUTBOX_HOLD_ACTION_KEY_PREFIX = "hold:outbox-action:"
  const val VERSION_KEY_PREFIX = "performance:venue-seat-event-version:"

  val getMyHoldsScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/get-my-holds.lua"))
    resultType = String::class.java
  }

  val beginCheckoutReviewScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/begin-checkout-review.lua"))
    resultType = String::class.java
  }

  val endCheckoutReviewScript = DefaultRedisScript<Long>().apply {
    setLocation(ClassPathResource("redis/end-checkout-review.lua"))
    resultType = Long::class.java
  }

  val holdSeatsScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/hold-seats.lua"))
    resultType = String::class.java
  }

  val releaseSeatsScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/release-seats.lua"))
    resultType = String::class.java
  }

  val transitionForPaymentScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/transition-for-payment.lua"))
    resultType = String::class.java
  }

  val supersedePaymentHoldsScript = DefaultRedisScript<Long>().apply {
    setLocation(ClassPathResource("redis/supersede-payment-holds.lua"))
    resultType = Long::class.java
  }

  val releaseHoldByIdScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/release-hold-by-id.lua"))
    resultType = String::class.java
  }

  val finalizeHoldByIdScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/finalize-hold-by-id.lua"))
    resultType = String::class.java
  }

  val releaseCancelledReservationSeatsScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/release-cancelled-reservation-seats.lua"))
    resultType = String::class.java
  }

  val expireHoldScript = DefaultRedisScript<String>().apply {
    setLocation(ClassPathResource("redis/expire-hold.lua"))
    resultType = String::class.java
  }
}

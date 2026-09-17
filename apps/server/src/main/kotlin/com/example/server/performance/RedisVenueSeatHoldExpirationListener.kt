package com.example.server.performance

import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets

@Component
class RedisVenueSeatHoldExpirationListener(private val performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher) : MessageListener {
  override fun onMessage(message: Message, pattern: ByteArray?) {
    val key = message.body.toString(StandardCharsets.UTF_8)

    val match = holdSeatKeyPattern.matchEntire(key)
      ?: return

    performanceVenueSeatStompPublisher.publishReleasedSeats(
      performanceId = match.groupValues[1].toLong(),
      venueSeatIds = listOf(match.groupValues[2].toLong()),
    )
  }

  companion object {
    private val holdSeatKeyPattern = Regex("^hold:venue-seat:(\\d+):(\\d+)$")
  }
}

package com.example.server.performance

import org.springframework.data.redis.connection.Message
import org.springframework.data.redis.connection.MessageListener
import org.springframework.stereotype.Component
import java.nio.charset.StandardCharsets

@Component
class RedisVenueSeatHoldExpirationListener(private val redisVenueSeatHoldService: RedisVenueSeatHoldService) : MessageListener {
  override fun onMessage(message: Message, pattern: ByteArray?) {
    val key = message.body.toString(StandardCharsets.UTF_8)

    val match = holdExpiryKeyPattern.matchEntire(key)
      ?: return

    redisVenueSeatHoldService.publishExpiredHold(match.groupValues[1])
  }

  companion object {
    private val holdExpiryKeyPattern = Regex("^hold:expiry:(.+)$")
  }
}

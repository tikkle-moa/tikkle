package com.example.server.performance

import com.example.server.global.stomp.dto.StompEvent
import com.example.server.performance.dto.HoldReleasedEventData
import com.example.server.performance.dto.PerformanceSeatEvent
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

@Component
class PerformanceSeatStompPublisher(private val messagingTemplate: SimpMessagingTemplate, private val stringRedisTemplate: StringRedisTemplate) {
  fun publishHoldReleased(performanceId: Long, seatIds: List<Long>) {
    val version = requireNotNull(
      stringRedisTemplate.opsForValue().increment(versionKey(performanceId)),
    ) {
      "공연 좌석 이벤트 버전을 증가시키지 못했습니다."
    }

    messagingTemplate.convertAndSend(
      "/topic/performances/$performanceId",
      StompEvent(
        eventId = UUID.randomUUID(),
        version = version,
        occurredAt = OffsetDateTime.now(ZoneOffset.UTC),
        type = PerformanceSeatEvent.HOLD_RELEASED.name,
        data = HoldReleasedEventData(seatIds),
      ),
    )
  }

  private fun versionKey(performanceId: Long) = "performance:seat-event-version:$performanceId"
}

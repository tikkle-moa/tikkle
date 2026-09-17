package com.example.server.performance

import com.example.server.performance.dto.PerformanceHeldSeatsEvent
import com.example.server.performance.dto.PerformanceSeatEvent
import com.example.server.performance.dto.PerformanceVenueSeatIdsEvent
import com.example.server.performance.dto.PerformanceVenueSeatIdsEventType
import io.github.springwolf.bindings.stomp.annotations.StompAsyncOperationBinding
import io.github.springwolf.core.asyncapi.annotations.AsyncOperation
import io.github.springwolf.core.asyncapi.annotations.AsyncPublisher
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class PerformanceVenueSeatStompPublisher(private val messagingTemplate: SimpMessagingTemplate, private val stringRedisTemplate: StringRedisTemplate) {
  fun publishHeldSeats(performanceId: Long, heldSeats: List<PerformanceHeldSeatsEvent.HeldSeat>, eventId: UUID = UUID.randomUUID()) {
    publish(
      performanceId = performanceId,
      event = PerformanceHeldSeatsEvent(
        eventId = eventId,
        version = getVersion(performanceId),
        data = heldSeats,
      ),
    )
  }

  fun publishReleasedSeats(performanceId: Long, venueSeatIds: List<Long>, eventId: UUID = UUID.randomUUID()) {
    publish(
      performanceId = performanceId,
      event = PerformanceVenueSeatIdsEvent(
        eventId = eventId,
        version = getVersion(performanceId),
        type = PerformanceVenueSeatIdsEventType.RELEASED_SEATS,
        data = venueSeatIds,
      ),
    )
  }

  fun publishReservationConfirmed(performanceId: Long, venueSeatIds: List<Long>, eventId: UUID = UUID.randomUUID()) {
    publish(
      performanceId = performanceId,
      event = PerformanceVenueSeatIdsEvent(
        eventId = eventId,
        version = getVersion(performanceId),
        type = PerformanceVenueSeatIdsEventType.RESERVATION_CONFIRMED,
        data = venueSeatIds,
      ),
    )
  }

  @AsyncPublisher(
    operation = AsyncOperation(
      channelName = "/topic/performances/{performanceId}/seat-events",
      payloadType = PerformanceSeatEvent::class,
    ),
  )
  @StompAsyncOperationBinding
  private fun publish(performanceId: Long, event: PerformanceSeatEvent) {
    messagingTemplate.convertAndSend(
      "/topic/performances/$performanceId/seat-events",
      event,
    )
  }

  private fun getVersion(performanceId: Long): Long {
    val version = stringRedisTemplate.opsForValue().increment(versionKey(performanceId))
    return version
  }

  private fun versionKey(performanceId: Long) = "performance:venue-seat-event-version:$performanceId"
}

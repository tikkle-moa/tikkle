package com.example.server.performance

import com.example.server.performance.dto.PerformanceHeldSeatsEventData
import com.example.server.performance.dto.PerformanceSeatEvent
import com.example.server.performance.dto.PerformanceSeatEventData
import com.example.server.performance.dto.PerformanceSeatEventType
import com.example.server.performance.dto.PerformanceVenueSeatIdsEventData
import io.github.springwolf.bindings.stomp.annotations.StompAsyncOperationBinding
import io.github.springwolf.core.asyncapi.annotations.AsyncOperation
import io.github.springwolf.core.asyncapi.annotations.AsyncPublisher
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class PerformanceVenueSeatStompPublisher(private val messagingTemplate: SimpMessagingTemplate, private val stringRedisTemplate: StringRedisTemplate) {
  fun publishHeldSeats(performanceId: Long, heldSeats: List<PerformanceHeldSeatsEventData.HeldSeat>, eventId: UUID = UUID.randomUUID()) {
    publish(
      eventId = eventId,
      performanceId = performanceId,
      type = PerformanceSeatEventType.HELD_SEATS,
      data = PerformanceHeldSeatsEventData(heldSeats),
    )
  }

  fun publishReleasedSeats(performanceId: Long, venueSeatIds: List<Long>, eventId: UUID = UUID.randomUUID()) {
    publish(
      eventId = eventId,
      performanceId = performanceId,
      type = PerformanceSeatEventType.RELEASED_SEATS,
      data = PerformanceVenueSeatIdsEventData(venueSeatIds),
    )
  }

  fun publishReservationConfirmed(performanceId: Long, venueSeatIds: List<Long>, eventId: UUID = UUID.randomUUID()) {
    publish(
      eventId = eventId,
      performanceId = performanceId,
      type = PerformanceSeatEventType.RESERVATION_CONFIRMED,
      data = PerformanceVenueSeatIdsEventData(venueSeatIds),
    )
  }

  @AsyncPublisher(
    operation = AsyncOperation(
      channelName = "/topic/performances/{performanceId}/seat-events",
      payloadType = PerformanceSeatEvent::class,
    ),
  )
  @StompAsyncOperationBinding
  private fun publish(eventId: UUID, performanceId: Long, type: PerformanceSeatEventType, data: PerformanceSeatEventData) {
    val version = stringRedisTemplate.opsForValue().increment(versionKey(performanceId))

    messagingTemplate.convertAndSend(
      "/topic/performances/$performanceId/seat-events",
      PerformanceSeatEvent(
        eventId = eventId,
        version = version,
        type = type,
        data = data,
      ),
    )
  }

  private fun versionKey(performanceId: Long) = "performance:venue-seat-event-version:$performanceId"
}

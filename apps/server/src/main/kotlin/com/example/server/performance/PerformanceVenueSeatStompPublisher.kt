package com.example.server.performance

import com.example.server.performance.dto.PerformanceHeldSeatsEvent
import com.example.server.performance.dto.PerformanceSeatEvent
import com.example.server.performance.dto.PerformanceVenueSeatIdsEvent
import com.example.server.performance.dto.PerformanceVenueSeatIdsEventType
import io.github.springwolf.bindings.stomp.annotations.StompAsyncOperationBinding
import io.github.springwolf.core.asyncapi.annotations.AsyncOperation
import io.github.springwolf.core.asyncapi.annotations.AsyncPublisher
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class PerformanceVenueSeatStompPublisher(private val messagingTemplate: SimpMessagingTemplate) {
  /**
   * Hold phase changed without changing the physical seat ownership.
   * The client uses the existing HELD_SEATS event as a status refresh trigger.
   */
  fun publishSeatStatusChanged(performanceId: Long, version: Long, eventId: UUID = UUID.randomUUID()) {
    publishHeldSeats(performanceId, emptyList(), version, eventId)
  }

  fun publishHeldSeats(performanceId: Long, heldSeats: List<PerformanceHeldSeatsEvent.HeldSeat>, version: Long, eventId: UUID = UUID.randomUUID()) {
    publish(
      performanceId = performanceId,
      event = PerformanceHeldSeatsEvent(
        eventId = eventId,
        version = version,
        data = heldSeats,
      ),
    )
  }

  fun publishReleasedSeats(performanceId: Long, venueSeatIds: List<Long>, version: Long, eventId: UUID = UUID.randomUUID()) {
    publish(
      performanceId = performanceId,
      event = PerformanceVenueSeatIdsEvent(
        eventId = eventId,
        version = version,
        type = PerformanceVenueSeatIdsEventType.RELEASED_SEATS,
        data = venueSeatIds,
      ),
    )
  }

  fun publishReservationConfirmed(performanceId: Long, venueSeatIds: List<Long>, version: Long, eventId: UUID = UUID.randomUUID()) {
    publish(
      performanceId = performanceId,
      event = PerformanceVenueSeatIdsEvent(
        eventId = eventId,
        version = version,
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
}

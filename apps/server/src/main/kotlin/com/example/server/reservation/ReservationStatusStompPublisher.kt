package com.example.server.reservation

import com.example.server.reservation.dto.ReservationStatusChangedEvent
import com.example.server.reservation.dto.ReservationStatusChangedEventData
import com.example.server.reservation.types.ReservationStatus
import io.github.springwolf.bindings.stomp.annotations.StompAsyncOperationBinding
import io.github.springwolf.core.asyncapi.annotations.AsyncOperation
import io.github.springwolf.core.asyncapi.annotations.AsyncPublisher
import org.slf4j.LoggerFactory
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class ReservationStatusStompPublisher(private val messagingTemplate: SimpMessagingTemplate) {
  private val log = LoggerFactory.getLogger(ReservationStatusStompPublisher::class.java)

  fun publish(userId: Long, reservationId: Long, status: ReservationStatus, eventId: UUID = UUID.randomUUID()) {
    runCatching {
      sendToUser(userId, reservationId, status, eventId)
    }.onFailure { exception ->
      log.warn("예매 상태 STOMP 알림 전송에 실패했습니다. reservationId={}", reservationId, exception)
    }
  }

  @AsyncPublisher(
    operation = AsyncOperation(
      channelName = "/user/queue/reservations/{reservationId}/status",
      payloadType = ReservationStatusChangedEvent::class,
    ),
  )
  @StompAsyncOperationBinding
  private fun sendToUser(userId: Long, reservationId: Long, status: ReservationStatus, eventId: UUID) {
    messagingTemplate.convertAndSendToUser(
      userId.toString(),
      "/queue/reservations/$reservationId/status",
      ReservationStatusChangedEvent(
        eventId = eventId,
        data = ReservationStatusChangedEventData(reservationId, status),
      ),
    )
  }
}

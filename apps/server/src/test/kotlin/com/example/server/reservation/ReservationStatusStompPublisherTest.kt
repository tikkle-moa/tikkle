package com.example.server.reservation

import com.example.server.reservation.dto.ReservationStatusChangedEvent
import com.example.server.reservation.dto.ReservationStatusChangedEventData
import com.example.server.reservation.dto.ReservationStatusChangedEventType
import com.example.server.reservation.types.ReservationStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.eq
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class ReservationStatusStompPublisherTest {
  @Mock lateinit var messagingTemplate: SimpMessagingTemplate

  @Test
  fun `예매자 전용 상태 큐로 예매 상태 변경 이벤트를 보낸다`() {
    val publisher = ReservationStatusStompPublisher(messagingTemplate)
    val eventId = UUID.fromString("06349b76-0c49-49a7-812e-79b81f515fa8")

    publisher.publish(USER_ID, RESERVATION_ID, ReservationStatus.REFUND_ACCOUNT_REQUIRED, eventId)

    val eventCaptor = ArgumentCaptor.forClass(ReservationStatusChangedEvent::class.java)
    then(messagingTemplate).should().convertAndSendToUser(
      eq(USER_ID.toString()),
      eq("/queue/reservations/$RESERVATION_ID/status"),
      eventCaptor.capture(),
    )
    assertThat(eventCaptor.value.eventId).isEqualTo(eventId)
    assertThat(eventCaptor.value.type).isEqualTo(ReservationStatusChangedEventType.STATUS_CHANGED)
    assertThat(eventCaptor.value.data)
      .isEqualTo(ReservationStatusChangedEventData(RESERVATION_ID, ReservationStatus.REFUND_ACCOUNT_REQUIRED))
  }

  private companion object {
    const val USER_ID = 1L
    const val RESERVATION_ID = 501L
  }
}

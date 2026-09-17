package com.example.server.performance

import com.example.server.performance.dto.PerformanceHeldSeatsEvent
import com.example.server.performance.dto.PerformanceHeldSeatsEventType
import com.example.server.performance.dto.PerformanceSeatEvent
import com.example.server.performance.dto.PerformanceVenueSeatIdsEvent
import com.example.server.performance.dto.PerformanceVenueSeatIdsEventType
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.time.LocalDateTime
import java.time.ZoneOffset

@ExtendWith(MockitoExtension::class)
class PerformanceVenueSeatStompPublisherTest {
  @Mock lateinit var messagingTemplate: SimpMessagingTemplate

  @Mock lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock lateinit var valueOperations: ValueOperations<String, String>

  @InjectMocks lateinit var publisher: PerformanceVenueSeatStompPublisher

  @Test
  fun `좌석 Hold 이벤트를 공연 좌석 이벤트 topic으로 발행한다`() {
    givenEventVersion()
    val heldSeats = listOf(
      PerformanceHeldSeatsEvent.HeldSeat(
        id = 101L,
        expiresAt = LocalDateTime.of(2026, 9, 16, 20, 0),
      ),
    )

    publisher.publishHeldSeats(PERFORMANCE_ID, heldSeats)

    assertPublishedEvent(
      expectedType = PerformanceHeldSeatsEventType.HELD_SEATS,
      expectedData = heldSeats,
    )
  }

  @Test
  fun `좌석 해제 이벤트를 공연 좌석 이벤트 topic으로 발행한다`() {
    givenEventVersion()

    publisher.publishReleasedSeats(PERFORMANCE_ID, VENUE_SEAT_IDS)

    assertPublishedEvent(
      expectedType = PerformanceVenueSeatIdsEventType.RELEASED_SEATS,
      expectedData = VENUE_SEAT_IDS,
    )
  }

  @Test
  fun `예매 확정 이벤트를 공연 좌석 이벤트 topic으로 발행한다`() {
    givenEventVersion()

    publisher.publishReservationConfirmed(PERFORMANCE_ID, VENUE_SEAT_IDS)

    assertPublishedEvent(
      expectedType = PerformanceVenueSeatIdsEventType.RESERVATION_CONFIRMED,
      expectedData = VENUE_SEAT_IDS,
    )
  }

  private fun givenEventVersion() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.increment(VERSION_KEY)).willReturn(EVENT_VERSION)
  }

  private fun assertPublishedEvent(expectedType: Any, expectedData: Any) {
    val destination = ArgumentCaptor.forClass(String::class.java)
    val payload = ArgumentCaptor.forClass(Any::class.java)
    then(messagingTemplate).should().convertAndSend(destination.capture(), payload.capture())

    val event = payload.value as PerformanceSeatEvent
    val version: Long
    val type: Any
    val occurredAt = when (event) {
      is PerformanceHeldSeatsEvent -> {
        version = event.version
        type = event.type
        assertThat(event.data).isEqualTo(expectedData)
        event.occurredAt
      }

      is PerformanceVenueSeatIdsEvent -> {
        version = event.version
        type = event.type
        assertThat(event.data).isEqualTo(expectedData)
        event.occurredAt
      }
    }

    assertThat(destination.value).isEqualTo("/topic/performances/$PERFORMANCE_ID/seat-events")
    assertThat(version).isEqualTo(EVENT_VERSION)
    assertThat(type).isEqualTo(expectedType)
    assertThat(occurredAt.offset).isEqualTo(ZoneOffset.UTC)
  }

  companion object {
    private const val PERFORMANCE_ID = 10L
    private const val EVENT_VERSION = 44L
    private const val VERSION_KEY = "performance:venue-seat-event-version:$PERFORMANCE_ID"
    private val VENUE_SEAT_IDS = listOf(101L, 102L)
  }
}

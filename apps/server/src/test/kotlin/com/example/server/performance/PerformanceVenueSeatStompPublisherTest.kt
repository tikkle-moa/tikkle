package com.example.server.performance

import com.example.server.global.stomp.StompEvent
import com.example.server.performance.dto.HoldReleasedEventData
import com.example.server.performance.dto.PerformanceSeatEvent
import com.example.server.performance.dto.ReservationConfirmedEventData
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
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
import java.time.ZoneOffset

@ExtendWith(MockitoExtension::class)
class PerformanceVenueSeatStompPublisherTest {
  @Mock lateinit var messagingTemplate: SimpMessagingTemplate

  @Mock lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock lateinit var valueOperations: ValueOperations<String, String>

  @InjectMocks lateinit var publisher: PerformanceVenueSeatStompPublisher

  @Test
  fun `Hold 해제 이벤트를 공연 topic으로 발행한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.increment("performance:seat-event-version:$PERFORMANCE_ID")).willReturn(EVENT_VERSION)

    publisher.publishHoldReleased(PERFORMANCE_ID, VENUE_SEAT_IDS)

    val destination = ArgumentCaptor.forClass(String::class.java)
    val payload = ArgumentCaptor.forClass(Any::class.java)
    then(messagingTemplate).should().convertAndSend(destination.capture(), payload.capture())

    val event = payload.value as StompEvent<*>
    assertThat(destination.value).isEqualTo("/topic/performances/$PERFORMANCE_ID")
    assertThat(event.version).isEqualTo(EVENT_VERSION)
    assertThat(event.type).isEqualTo(PerformanceSeatEvent.HOLD_RELEASED.name)
    assertThat(event.occurredAt.offset).isEqualTo(ZoneOffset.UTC)
    assertThat(event.data).isEqualTo(HoldReleasedEventData(VENUE_SEAT_IDS))
  }

  @Test
  fun `예매 확정 이벤트도 동일한 topic과 좌석 목록으로 발행한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.increment("performance:seat-event-version:$PERFORMANCE_ID")).willReturn(EVENT_VERSION)

    publisher.publishReservationConfirmed(PERFORMANCE_ID, VENUE_SEAT_IDS)

    val payload = ArgumentCaptor.forClass(Any::class.java)
    then(messagingTemplate).should().convertAndSend(
      org.mockito.ArgumentMatchers.eq("/topic/performances/$PERFORMANCE_ID"),
      payload.capture(),
    )
    val event = payload.value as StompEvent<*>
    assertThat(event.type).isEqualTo(PerformanceSeatEvent.RESERVATION_CONFIRMED.name)
    assertThat(event.data).isEqualTo(ReservationConfirmedEventData(VENUE_SEAT_IDS))
  }

  @Test
  fun `이벤트 버전을 증가시키지 못하면 발행하지 않는다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.increment("performance:seat-event-version:$PERFORMANCE_ID")).willReturn(null)

    val exception = assertThrows<IllegalArgumentException> {
      publisher.publishHoldReleased(PERFORMANCE_ID, VENUE_SEAT_IDS)
    }

    assertThat(exception).hasMessage("공연 좌석 이벤트 버전을 증가시키지 못했습니다.")
    then(messagingTemplate).shouldHaveNoInteractions()
  }

  companion object {
    private const val PERFORMANCE_ID = 10L
    private const val EVENT_VERSION = 44L
    private val VENUE_SEAT_IDS = listOf(101L, 102L)
  }
}

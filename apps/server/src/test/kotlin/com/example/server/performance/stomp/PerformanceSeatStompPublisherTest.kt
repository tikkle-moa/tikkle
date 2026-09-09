package com.example.server.performance.stomp

import com.example.server.global.stomp.dto.StompEvent
import com.example.server.performance.stomp.dto.HoldReleasedEventData
import com.example.server.performance.stomp.dto.PerformanceSeatEvent
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
class PerformanceSeatStompPublisherTest {
  @Mock
  lateinit var messagingTemplate: SimpMessagingTemplate

  @Mock
  lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock
  lateinit var valueOperations: ValueOperations<String, String>

  @InjectMocks
  lateinit var publisher: PerformanceSeatStompPublisher

  @Test
  fun `좌석 해제 이벤트를 공연 topic으로 발행한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(
      valueOperations.increment("performance:seat-event-version:$PERFORMANCE_ID"),
    ).willReturn(EVENT_VERSION)

    publisher.publishHoldReleased(
      performanceId = PERFORMANCE_ID,
      seatIds = SEAT_IDS,
    )

    val destinationCaptor = ArgumentCaptor.forClass(String::class.java)
    val eventCaptor = ArgumentCaptor.forClass(Any::class.java)

    then(messagingTemplate)
      .should()
      .convertAndSend(
        destinationCaptor.capture(),
        eventCaptor.capture(),
      )

    val event = eventCaptor.value as StompEvent<*>

    assertThat(destinationCaptor.value)
      .isEqualTo("/topic/performances/$PERFORMANCE_ID")
    assertThat(event.version).isEqualTo(EVENT_VERSION)
    assertThat(event.type).isEqualTo(PerformanceSeatEvent.HOLD_RELEASED.name)
    assertThat(event.occurredAt.offset).isEqualTo(ZoneOffset.UTC)
    assertThat(event.data).isEqualTo(HoldReleasedEventData(SEAT_IDS))
  }

  @Test
  fun `좌석 이벤트 버전을 증가시키지 못하면 예외를 던지고 발행하지 않는다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(
      valueOperations.increment("performance:seat-event-version:$PERFORMANCE_ID"),
    ).willReturn(null)

    val exception = assertThrows<IllegalArgumentException> {
      publisher.publishHoldReleased(
        performanceId = PERFORMANCE_ID,
        seatIds = SEAT_IDS,
      )
    }

    assertThat(exception.message)
      .isEqualTo("공연 좌석 이벤트 버전을 증가시키지 못했습니다.")
    then(messagingTemplate).shouldHaveNoInteractions()
  }

  companion object {
    private const val PERFORMANCE_ID = 10L
    private const val EVENT_VERSION = 44L
    private val SEAT_IDS = listOf(101L, 102L)
  }
}

package com.example.server.performance

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.connection.DefaultMessage
import java.nio.charset.StandardCharsets

@ExtendWith(MockitoExtension::class)
class RedisVenueSeatHoldExpirationListenerTest {
  @Mock lateinit var performanceVenueSeatStompPublisher: PerformanceVenueSeatStompPublisher

  @InjectMocks lateinit var listener: RedisVenueSeatHoldExpirationListener

  @Test
  fun `만료된 공연장 좌석 Hold 키를 해제 이벤트로 발행한다`() {
    listener.onMessage(message("hold:venue-seat:10:101"), null)

    then(performanceVenueSeatStompPublisher).should().publishHoldReleased(
      performanceId = 10L,
      venueSeatIds = listOf(101L),
    )
  }

  @ParameterizedTest
  @ValueSource(
    strings = [
      "hold:detail:hold-123",
      "hold:group:user:10",
      "hold:venue-seat-finalizing:10:101",
      "oauth:state:abc",
      "performance:seat-event-version:10",
    ],
  )
  fun `좌석 Hold 키가 아닌 만료 이벤트는 무시한다`(key: String) {
    listener.onMessage(message(key), null)
    then(performanceVenueSeatStompPublisher).shouldHaveNoInteractions()
  }

  private fun message(key: String) = DefaultMessage(
    EXPIRED_CHANNEL.toByteArray(StandardCharsets.UTF_8),
    key.toByteArray(StandardCharsets.UTF_8),
  )

  companion object {
    private const val EXPIRED_CHANNEL = "__keyevent@0__:expired"
  }
}

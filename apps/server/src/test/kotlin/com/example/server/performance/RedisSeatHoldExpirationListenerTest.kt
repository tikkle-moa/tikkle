package com.example.server.performance

import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
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
class RedisSeatHoldExpirationListenerTest {
  @Mock
  lateinit var performanceSeatEventPublisher: PerformanceSeatEventPublisher

  @InjectMocks
  lateinit var listener: RedisSeatHoldExpirationListener

  @Nested
  @DisplayName("onMessage")
  inner class OnMessage {
    @Test
    fun `만료된 좌석 Hold 키를 HOLD_RELEASED 이벤트로 발행한다`() {
      listener.onMessage(
        message("hold:seat:10:101"),
        null,
      )

      then(performanceSeatEventPublisher)
        .should()
        .publishHoldReleased(
          performanceId = 10L,
          seatIds = listOf(101L),
        )
    }

    @ParameterizedTest
    @ValueSource(
      strings = [
        "hold:hold-123",
        "oauth:state:abc",
        "performance:seat-event-version:10",
      ],
    )
    fun `좌석 Hold 키가 아닌 만료 이벤트는 무시한다`(key: String) {
      listener.onMessage(message(key), null)

      then(performanceSeatEventPublisher).shouldHaveNoInteractions()
    }
  }

  private fun message(key: String): DefaultMessage = DefaultMessage(
    EXPIRED_CHANNEL.toByteArray(StandardCharsets.UTF_8),
    key.toByteArray(StandardCharsets.UTF_8),
  )

  companion object {
    private const val EXPIRED_CHANNEL = "__keyevent@0__:expired"
  }
}

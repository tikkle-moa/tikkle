package com.example.server.outbox

import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.repository.OutboxEventRepository
import com.example.server.outbox.types.OutboxEventStatus
import com.example.server.performance.dto.VenueSeatHoldDetail
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class OutboxEventServiceTest {
  @Mock
  lateinit var outboxEventRepository: OutboxEventRepository

  @Mock
  lateinit var objectMapper: ObjectMapper

  @InjectMocks
  lateinit var service: OutboxEventService

  @Test
  fun `예매 확정 이벤트는 Hold 식별자와 좌석 목록을 Outbox payload로 저장한다`() {
    val hold = hold()
    given(objectMapper.writeValueAsString(org.mockito.ArgumentMatchers.any<Any>())).willReturn(PAYLOAD)

    service.recordReservationConfirmed(RESERVATION_ID, hold)

    val captor = ArgumentCaptor.forClass(OutboxEvent::class.java)
    then(outboxEventRepository).should().save(captor.capture())
    val event = captor.value
    assertThat(event.eventKey).isEqualTo("reservation:$RESERVATION_ID:reservation-confirmed:${hold.holdId}")
    assertThat(event.eventType.name).isEqualTo("RESERVATION_CONFIRMED")
    assertThat(event.status).isEqualTo(OutboxEventStatus.PENDING)
    assertThat(event.payload).isEqualTo(PAYLOAD)
    assertThat(event.eventId).isNotBlank()
  }

  @Test
  fun `처리 중 lease가 만료된 이벤트를 다시 점유하고 시도 횟수를 증가시킨다`() {
    val event = OutboxEvent(
      eventKey = "reservation:$RESERVATION_ID:hold-released:${hold().holdId}",
      aggregateType = "RESERVATION",
      aggregateId = RESERVATION_ID,
      performanceId = PERFORMANCE_ID,
      eventType = com.example.server.outbox.types.OutboxEventType.HOLD_RELEASED,
      payload = PAYLOAD,
      status = OutboxEventStatus.PROCESSING,
      attemptCount = 1,
      lockedAt = LocalDateTime.now().minusMinutes(1),
    )
    given(
      outboxEventRepository.findNextClaimableForUpdate(
        pendingStatus = org.mockito.ArgumentMatchers.any(),
        processingStatus = org.mockito.ArgumentMatchers.any(),
        now = org.mockito.ArgumentMatchers.any(),
        leaseExpiredAt = org.mockito.ArgumentMatchers.any(),
        pageable = org.mockito.ArgumentMatchers.any(),
      ),
    ).willReturn(listOf(event))

    val claimed = service.claimNext(30_000)

    assertThat(claimed).isSameAs(event)
    assertThat(event.status).isEqualTo(OutboxEventStatus.PROCESSING)
    assertThat(event.attemptCount).isEqualTo(2)
    assertThat(event.lockToken).isNotBlank()
    assertThat(event.lockedAt).isNotNull()
    then(outboxEventRepository).should().saveAndFlush(event)
  }

  private fun hold() = VenueSeatHoldDetail(
    holdId = "hold-1",
    groupId = GROUP_ID,
    performanceId = PERFORMANCE_ID,
    venueSeatIds = listOf(101L, 102L),
    expiresAt = LocalDateTime.now().plusMinutes(5),
  )

  companion object {
    private const val RESERVATION_ID = 501L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = "1:10"
    private const val PAYLOAD = "{}"
  }
}

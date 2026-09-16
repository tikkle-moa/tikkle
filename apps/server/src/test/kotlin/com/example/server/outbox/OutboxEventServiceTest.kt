package com.example.server.outbox

import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.repository.OutboxEventRepository
import com.example.server.outbox.types.OutboxEventStatus
import com.example.server.outbox.types.OutboxEventType
import com.example.server.performance.dto.VenueSeatHoldDetail
import com.example.server.support.any
import com.example.server.support.anyNonNull
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.domain.Pageable
import tools.jackson.databind.ObjectMapper
import java.time.LocalDateTime
import java.util.Optional

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
    given(objectMapper.writeValueAsString(any<Any>())).willReturn(PAYLOAD)

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
  fun `Hold 해제 이벤트는 해제 유형과 Hold 식별자를 저장한다`() {
    val hold = hold()
    given(objectMapper.writeValueAsString(any<Any>())).willReturn(PAYLOAD)

    service.recordHoldReleased(RESERVATION_ID, hold)

    val captor = ArgumentCaptor.forClass(OutboxEvent::class.java)
    then(outboxEventRepository).should().save(captor.capture())
    val event = captor.value
    assertThat(event.eventKey).isEqualTo("reservation:$RESERVATION_ID:hold-released:${hold.holdId}")
    assertThat(event.eventType).isEqualTo(OutboxEventType.HOLD_RELEASED)
    assertThat(event.status).isEqualTo(OutboxEventStatus.PENDING)
    assertThat(event.payload).isEqualTo(PAYLOAD)
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
        pendingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PENDING),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        now = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        leaseExpiredAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        pageable = anyNonNull(Pageable::class.java, Pageable.unpaged()),
      ),
    ).willReturn(listOf(event))

    val claimed = service.claimNext(30_000)

    assertThat(claimed).isSameAs(event)
    assertThat(event.status).isEqualTo(OutboxEventStatus.PROCESSING)
    assertThat(event.attemptCount).isEqualTo(2)
    assertThat(event.processingOwner).isNotBlank()
    assertThat(event.lockedAt).isNotNull()
    then(outboxEventRepository).should().saveAndFlush(event)
  }

  @Test
  fun `점유할 Outbox 이벤트가 없으면 null을 반환한다`() {
    given(
      outboxEventRepository.findNextClaimableForUpdate(
        pendingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PENDING),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        now = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        leaseExpiredAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        pageable = anyNonNull(Pageable::class.java, Pageable.unpaged()),
      ),
    ).willReturn(emptyList())

    assertThat(service.claimNext(30_000)).isNull()
  }

  @Test
  fun `처리 중 이벤트를 PUBLISHED로 변경한다`() {
    val event = processingEvent()
    given(
      outboxEventRepository.markPublishedIfOwned(
        eventId = anyNonNull(Long::class.java, event.id),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        publishedStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PUBLISHED),
        processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
        publishedAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      ),
    ).willReturn(1)

    service.markPublished(event.id, PROCESSING_OWNER)

    then(outboxEventRepository).should().markPublishedIfOwned(
      eventId = anyNonNull(Long::class.java, event.id),
      processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
      publishedStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PUBLISHED),
      processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
      publishedAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
    )
    then(outboxEventRepository).should(org.mockito.Mockito.never()).save(any(OutboxEvent::class.java))
  }

  @Test
  fun `lease 재점유 후 오래된 작업자의 발행 완료 갱신을 무시한다`() {
    given(
      outboxEventRepository.markPublishedIfOwned(
        eventId = anyNonNull(Long::class.java, RESERVATION_ID),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        publishedStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PUBLISHED),
        processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
        publishedAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      ),
    ).willReturn(0)

    service.markPublished(RESERVATION_ID, PROCESSING_OWNER)

    then(outboxEventRepository).should().markPublishedIfOwned(
      eventId = anyNonNull(Long::class.java, RESERVATION_ID),
      processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
      publishedStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PUBLISHED),
      processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
      publishedAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
    )
    then(outboxEventRepository).should(org.mockito.Mockito.never()).save(any(OutboxEvent::class.java))
  }

  @Test
  fun `재시도 가능한 이벤트를 PENDING으로 되돌린다`() {
    val event = processingEvent(attemptCount = 1)
    val exception = IllegalStateException("redis failed")
    given(outboxEventRepository.findById(event.id)).willReturn(Optional.of(event))
    given(
      outboxEventRepository.markFailedIfOwned(
        eventId = anyNonNull(Long::class.java, event.id),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        status = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PENDING),
        processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
        nextAttemptAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        lastError = anyNonNull(String::class.java, exception.message!!),
      ),
    ).willReturn(1)

    service.markFailed(
      eventId = event.id,
      processingOwner = PROCESSING_OWNER,
      exception = exception,
      maxAttempts = 5,
      retryDelayMillis = 1_000,
    )

    then(outboxEventRepository).should().markFailedIfOwned(
      eventId = anyNonNull(Long::class.java, event.id),
      processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
      status = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PENDING),
      processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
      nextAttemptAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      lastError = anyNonNull(String::class.java, exception.message!!),
    )
    then(outboxEventRepository).should(org.mockito.Mockito.never()).save(any(OutboxEvent::class.java))
  }

  @Test
  fun `최대 시도 횟수에 도달한 이벤트를 DEAD로 변경한다`() {
    val event = processingEvent(attemptCount = 5)
    val exception = RuntimeException()
    given(outboxEventRepository.findById(event.id)).willReturn(Optional.of(event))
    given(
      outboxEventRepository.markFailedIfOwned(
        eventId = anyNonNull(Long::class.java, event.id),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        status = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.DEAD),
        processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
        nextAttemptAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        lastError = anyNonNull(String::class.java, "RuntimeException"),
      ),
    ).willReturn(1)

    service.markFailed(
      eventId = event.id,
      processingOwner = PROCESSING_OWNER,
      exception = exception,
      maxAttempts = 5,
      retryDelayMillis = 1_000,
    )

    then(outboxEventRepository).should().markFailedIfOwned(
      eventId = anyNonNull(Long::class.java, event.id),
      processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
      status = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.DEAD),
      processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
      nextAttemptAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      lastError = anyNonNull(String::class.java, "RuntimeException"),
    )
    then(outboxEventRepository).should(org.mockito.Mockito.never()).save(any(OutboxEvent::class.java))
  }

  @Test
  fun `lease 재점유 후 오래된 작업자의 실패 상태 갱신을 무시한다`() {
    val event = processingEvent()
    given(outboxEventRepository.findById(event.id)).willReturn(Optional.of(event))
    given(
      outboxEventRepository.markFailedIfOwned(
        eventId = anyNonNull(Long::class.java, event.id),
        processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
        status = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PENDING),
        processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
        nextAttemptAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        lastError = anyNonNull(String::class.java, "redis failed"),
      ),
    ).willReturn(0)

    service.markFailed(
      eventId = event.id,
      processingOwner = PROCESSING_OWNER,
      exception = IllegalStateException("redis failed"),
      maxAttempts = 5,
      retryDelayMillis = 1_000,
    )

    then(outboxEventRepository).should().markFailedIfOwned(
      eventId = anyNonNull(Long::class.java, event.id),
      processingStatus = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PROCESSING),
      status = anyNonNull(OutboxEventStatus::class.java, OutboxEventStatus.PENDING),
      processingOwner = anyNonNull(String::class.java, PROCESSING_OWNER),
      nextAttemptAt = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      lastError = anyNonNull(String::class.java, "redis failed"),
    )
    then(outboxEventRepository).should(org.mockito.Mockito.never()).save(any(OutboxEvent::class.java))
  }

  @Test
  fun `없는 이벤트나 점유 정보가 다르면 실패 상태 변경을 무시한다`() {
    given(outboxEventRepository.findById(RESERVATION_ID)).willReturn(Optional.empty())

    service.markFailed(
      eventId = RESERVATION_ID,
      processingOwner = PROCESSING_OWNER,
      exception = IllegalStateException("redis failed"),
      maxAttempts = 5,
      retryDelayMillis = 1_000,
    )

    val wrongStatusEvent = processingEvent().also {
      it.id = RESERVATION_ID + 1
      it.status = OutboxEventStatus.PENDING
    }
    given(outboxEventRepository.findById(wrongStatusEvent.id)).willReturn(Optional.of(wrongStatusEvent))

    service.markFailed(
      eventId = wrongStatusEvent.id,
      processingOwner = PROCESSING_OWNER,
      exception = IllegalStateException("redis failed"),
      maxAttempts = 5,
      retryDelayMillis = 1_000,
    )

    val event = processingEvent().also {
      it.id = RESERVATION_ID + 2
      it.processingOwner = "another-processing-owner"
    }
    given(outboxEventRepository.findById(event.id)).willReturn(Optional.of(event))

    service.markFailed(
      eventId = event.id,
      processingOwner = PROCESSING_OWNER,
      exception = IllegalStateException("redis failed"),
      maxAttempts = 5,
      retryDelayMillis = 1_000,
    )

    then(outboxEventRepository).should(org.mockito.Mockito.never()).save(any(OutboxEvent::class.java))
  }

  private fun hold() = VenueSeatHoldDetail(
    holdId = "hold-1",
    groupId = GROUP_ID,
    performanceId = PERFORMANCE_ID,
    venueSeatIds = listOf(101L, 102L),
    expiresAt = LocalDateTime.now().plusMinutes(5),
  )

  private fun processingEvent(attemptCount: Int = 1) = OutboxEvent(
    eventKey = "reservation:$RESERVATION_ID:reservation-confirmed:hold-1",
    aggregateType = "RESERVATION",
    aggregateId = RESERVATION_ID,
    performanceId = PERFORMANCE_ID,
    eventType = OutboxEventType.RESERVATION_CONFIRMED,
    payload = PAYLOAD,
    status = OutboxEventStatus.PROCESSING,
    attemptCount = attemptCount,
    processingOwner = PROCESSING_OWNER,
    lockedAt = LocalDateTime.now(),
  )

  companion object {
    private const val RESERVATION_ID = 501L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = "1:10"
    private const val PAYLOAD = "{}"
    private const val PROCESSING_OWNER = "processing-owner"
  }
}

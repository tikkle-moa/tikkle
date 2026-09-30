package com.example.server.outbox

import com.example.server.config.properties.OutboxCleanupProperties
import com.example.server.support.anyNonNull
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class OutboxEventCleanupSchedulerTest {
  @Mock
  lateinit var outboxEventCleanupService: OutboxEventCleanupService

  private val properties = OutboxCleanupProperties(
    batchSize = 100,
    retentionMonths = 2,
  )

  @Test
  fun `삭제된 이벤트가 있으면 보존 기간과 batch size로 정리한다`() {
    givenDeletePublishedBefore(2)

    scheduler().cleanupPublishedEvents()

    then(outboxEventCleanupService).should().deletePublishedBefore(
      performanceStartedBefore = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      batchSize = anyInt(),
    )
  }

  @Test
  fun `삭제된 이벤트가 없어도 정리 서비스를 호출한다`() {
    givenDeletePublishedBefore(0)

    scheduler().cleanupPublishedEvents()

    then(outboxEventCleanupService).should().deletePublishedBefore(
      performanceStartedBefore = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
      batchSize = anyInt(),
    )
  }

  private fun givenDeletePublishedBefore(deletedCount: Int) {
    given(
      outboxEventCleanupService.deletePublishedBefore(
        performanceStartedBefore = anyNonNull(LocalDateTime::class.java, LocalDateTime.MIN),
        batchSize = anyInt(),
      ),
    ).willReturn(deletedCount)
  }

  private fun scheduler() = OutboxEventCleanupScheduler(
    outboxEventCleanupService = outboxEventCleanupService,
    properties = properties,
  )
}

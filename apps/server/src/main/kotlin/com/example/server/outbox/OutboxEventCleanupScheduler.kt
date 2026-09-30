package com.example.server.outbox

import com.example.server.config.properties.OutboxCleanupProperties
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.LocalDateTime

@Component
@ConditionalOnProperty(
  prefix = "outbox.cleanup",
  name = ["enabled"],
  havingValue = "true",
  matchIfMissing = true,
)
class OutboxEventCleanupScheduler(
  private val outboxEventCleanupService: OutboxEventCleanupService,
  private val properties: OutboxCleanupProperties,
) {
  private val log = LoggerFactory.getLogger(OutboxEventCleanupScheduler::class.java)

  @Scheduled(fixedDelayString = "\${outbox.cleanup.fixed-delay:86400000}")
  fun cleanupPublishedEvents() {
    val performanceStartedBefore = LocalDateTime.now().minusMonths(properties.retentionMonths)
    val deletedCount = outboxEventCleanupService.deletePublishedBefore(
      performanceStartedBefore = performanceStartedBefore,
      batchSize = properties.batchSize,
    )

    if (deletedCount > 0) {
      log.info(
        "공연 시작일 기준 보존 기간이 지난 PUBLISHED Outbox 이벤트를 정리했습니다. count={}, before={}",
        deletedCount,
        performanceStartedBefore,
      )
    }
  }
}

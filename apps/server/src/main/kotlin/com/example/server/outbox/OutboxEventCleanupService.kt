package com.example.server.outbox

import com.example.server.outbox.repository.OutboxEventRepository
import com.example.server.outbox.types.OutboxEventStatus
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
class OutboxEventCleanupService(private val outboxEventRepository: OutboxEventRepository) {
  @Transactional
  fun deletePublishedBefore(performanceStartedBefore: LocalDateTime, batchSize: Int): Int {
    require(batchSize > 0) { "Outbox 정리 batchSize는 0보다 커야 합니다." }

    val eventIds = outboxEventRepository.findPublishedIdsForCleanup(
      status = OutboxEventStatus.PUBLISHED.name,
      performanceStartedBefore = performanceStartedBefore,
      pageable = PageRequest.of(0, batchSize),
    )
    if (eventIds.isEmpty()) return 0

    outboxEventRepository.deleteAllByIdInBatch(eventIds)
    return eventIds.size
  }
}

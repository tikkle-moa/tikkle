package com.example.server.outbox.repository

import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.types.OutboxEventStatus
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface OutboxEventRepository : JpaRepository<OutboxEvent, Long> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
    """
    SELECT event
    FROM OutboxEvent event
    WHERE (event.status = :pendingStatus AND event.nextAttemptAt <= :now)
       OR (event.status = :processingStatus AND event.lockedAt <= :leaseExpiredAt)
    ORDER BY event.id
    """,
  )
  fun findNextClaimableForUpdate(
    @Param("pendingStatus")
    pendingStatus: OutboxEventStatus,
    @Param("processingStatus")
    processingStatus: OutboxEventStatus,
    @Param("now")
    now: LocalDateTime,
    @Param("leaseExpiredAt")
    leaseExpiredAt: LocalDateTime,
    pageable: Pageable,
  ): List<OutboxEvent>

  @Query(
    value = """
      SELECT oe.id
      FROM outbox_events oe
      JOIN performances p ON p.id = oe.performance_id
      WHERE oe.status = :status
        AND p.starts_at <= :performanceStartedBefore
      ORDER BY oe.id
    """,
    nativeQuery = true,
  )
  fun findPublishedIdsForCleanup(
    @Param("status") status: String,
    @Param("performanceStartedBefore") performanceStartedBefore: LocalDateTime,
    pageable: Pageable,
  ): List<Long>
}

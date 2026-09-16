package com.example.server.outbox.repository

import com.example.server.outbox.entity.OutboxEvent
import com.example.server.outbox.types.OutboxEventStatus
import jakarta.persistence.LockModeType
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Modifying
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

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
    """
    UPDATE OutboxEvent event
    SET event.status = :publishedStatus,
        event.lockToken = null,
        event.lockedAt = null,
        event.publishedAt = :publishedAt,
        event.nextAttemptAt = :publishedAt
    WHERE event.id = :eventId
      AND event.status = :processingStatus
      AND event.lockToken = :lockToken
    """,
  )
  fun markPublishedIfOwned(
    @Param("eventId") eventId: Long,
    @Param("processingStatus") processingStatus: OutboxEventStatus,
    @Param("publishedStatus") publishedStatus: OutboxEventStatus,
    @Param("lockToken") lockToken: String,
    @Param("publishedAt") publishedAt: LocalDateTime,
  ): Int

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
    """
    UPDATE OutboxEvent event
    SET event.status = :status,
        event.nextAttemptAt = :nextAttemptAt,
        event.lockToken = null,
        event.lockedAt = null,
        event.lastError = :lastError
    WHERE event.id = :eventId
      AND event.status = :processingStatus
      AND event.lockToken = :lockToken
    """,
  )
  fun markFailedIfOwned(
    @Param("eventId") eventId: Long,
    @Param("processingStatus") processingStatus: OutboxEventStatus,
    @Param("status") status: OutboxEventStatus,
    @Param("lockToken") lockToken: String,
    @Param("nextAttemptAt") nextAttemptAt: LocalDateTime,
    @Param("lastError") lastError: String?,
  ): Int
}

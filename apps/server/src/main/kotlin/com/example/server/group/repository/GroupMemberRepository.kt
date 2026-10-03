package com.example.server.group.repository

import com.example.server.group.entity.GroupMember
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface GroupMemberRepository : JpaRepository<GroupMember, Long> {
  @Query(
    """
    SELECT groupMember.group.id
    FROM GroupMember groupMember
    WHERE groupMember.member.id = :userId
      AND groupMember.group.performance.id = :performanceId
      AND groupMember.group.expiresAt > CURRENT_TIMESTAMP
    """,
  )
  fun findActiveGroupIdByUserIdAndPerformanceId(@Param("userId") userId: Long, @Param("performanceId") performanceId: Long): Long?
}

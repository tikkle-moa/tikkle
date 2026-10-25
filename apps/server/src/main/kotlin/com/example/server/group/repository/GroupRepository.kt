package com.example.server.group.repository

import com.example.server.group.entity.Group
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface GroupRepository : JpaRepository<Group, Long> {
  fun existsByInviteCode(inviteCode: String): Boolean

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT g FROM Group g WHERE g.id = :groupId")
  fun findByIdForUpdate(@Param("groupId") groupId: Long): Group?

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT g FROM Group g WHERE g.inviteCode = :inviteCode")
  fun findByInviteCodeForUpdate(@Param("inviteCode") inviteCode: String): Group?
}

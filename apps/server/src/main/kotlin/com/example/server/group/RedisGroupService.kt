package com.example.server.group

import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service

@Service
class RedisGroupService(private val stringRedisTemplate: StringRedisTemplate) {
  fun getGroupId(userId: Long, performanceId: Long): String? {
    val groupId = stringRedisTemplate.opsForValue()
      .get(performanceUserGroupIdKey(performanceId, userId))
    return groupId
  }

  /**
   * TODO: 그룹 생성·참여·탈퇴·강퇴 구현 시 아래 구조를 고려합니다. 구현 방식에 따라 변경할 수 있습니다.
   * - 공연별 그룹 ID 목록: `group:{performanceId}`
   * - 그룹별 사용자 ID 목록: `group:{performanceId}:group:{groupId}`
   * - 사용자별 공연 그룹 역인덱스: `group:{performanceId}:user:{userId}` -> `{groupId}`
   */
  private fun performanceUserGroupIdKey(performanceId: Long, userId: Long) = "$GROUP_KEY_PREFIX:$performanceId:user:$userId"

  companion object {
    private const val GROUP_KEY_PREFIX = "group"
  }
}

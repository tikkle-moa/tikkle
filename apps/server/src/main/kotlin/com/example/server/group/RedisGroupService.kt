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

  private fun performanceUserGroupIdKey(performanceId: Long, userId: Long) = "$GROUP_KEY_PREFIX:$performanceId:user:$userId"

  companion object {
    private const val GROUP_KEY_PREFIX = "group"
  }
}

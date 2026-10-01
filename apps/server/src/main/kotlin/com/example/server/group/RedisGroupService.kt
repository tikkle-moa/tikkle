package com.example.server.group

import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service

@Service
class RedisGroupService(private val stringRedisTemplate: StringRedisTemplate) {
  fun getGroupId(userId: Long, performanceId: Long): String {
    val groupId = stringRedisTemplate.opsForValue()
      .get(performanceUserGroupIdKey(performanceId, userId))
      ?: throw CustomException(ErrorCode.FORBIDDEN, "사용자가 속한 그룹을 찾을 수 없습니다.")
    return groupId
  }

  private fun performanceUserGroupIdKey(performanceId: Long, userId: Long) = "$GROUP_KEY_PREFIX:$performanceId:user:$userId"

  companion object {
    private const val GROUP_KEY_PREFIX = "group"
  }
}

package com.example.server.global.security

import com.example.server.auth.dto.AccessTokenPayload
import com.example.server.auth.refreshTokenKey
import com.example.server.group.RedisGroupService
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component
import java.time.Instant

@Component
class StompAuthenticationChannelInterceptor(private val stringRedisTemplate: StringRedisTemplate, private val redisGroupService: RedisGroupService) :
  ChannelInterceptor {
  override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
    val accessor = StompHeaderAccessor.wrap(message)

    if (accessor.command !in setOf(StompCommand.SEND, StompCommand.SUBSCRIBE)) {
      return message
    }

    val authentication = accessor.user as? Authentication
      ?: throw AccessDeniedException("인증 정보가 없습니다.")

    val accessTokenPayload = authentication.details as? AccessTokenPayload
      ?: throw AccessDeniedException("인증 정보가 없습니다.")

    if (!accessTokenPayload.expiresAt.isAfter(Instant.now())) {
      throw AccessDeniedException("액세스 토큰이 만료되었습니다.")
    }

    val storedUserId = stringRedisTemplate.opsForValue()
      .get(refreshTokenKey(accessTokenPayload.tokenId))

    if (storedUserId != accessTokenPayload.userId.toString()) {
      throw AccessDeniedException("유효하지 않은 인증 세션입니다.")
    }

    validateGroupChatSubscription(accessTokenPayload, accessor)

    return message
  }

  private fun validateGroupChatSubscription(accessTokenPayload: AccessTokenPayload, accessor: StompHeaderAccessor) {
    if (accessor.command != StompCommand.SUBSCRIBE) return

    val groupId = GROUP_CHAT_DESTINATION.matchEntire(accessor.destination.orEmpty())
      ?.groupValues
      ?.get(1)
      ?: return

    val performanceId = accessor.getFirstNativeHeader(PERFORMANCE_ID_HEADER)
      ?.toLongOrNull()
      ?: throw AccessDeniedException("그룹 채팅 구독에 공연 ID가 필요합니다.")

    val memberGroupId = redisGroupService.getGroupId(accessTokenPayload.userId, performanceId)
    if (memberGroupId != groupId) {
      throw AccessDeniedException("그룹 채팅 구독 권한이 없습니다.")
    }
  }

  companion object {
    private const val PERFORMANCE_ID_HEADER = "performanceId"
    private val GROUP_CHAT_DESTINATION = Regex("^/topic/groups/([^/]+)/chat$")
  }
}

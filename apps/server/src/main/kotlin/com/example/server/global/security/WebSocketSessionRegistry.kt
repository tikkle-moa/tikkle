package com.example.server.global.security

import com.example.server.auth.dto.AccessTokenPayload
import com.example.server.auth.refreshTokenKey
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Component
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.WebSocketSession
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

@Component
class WebSocketSessionRegistry(private val stringRedisTemplate: StringRedisTemplate) {
  private val log = LoggerFactory.getLogger(WebSocketSessionRegistry::class.java)

  private val sessionsByTokenId =
    ConcurrentHashMap<String, Map<String, WebSocketSession>>()

  fun register(session: WebSocketSession) {
    val payload = accessTokenPayload(session)

    if (payload == null) {
      close(session, CloseStatus.POLICY_VIOLATION)
      return
    }

    sessionsByTokenId.compute(payload.tokenId) { _, sessions ->
      sessions.orEmpty() + (session.id to session)
    }

    try {
      val storedUserId = stringRedisTemplate.opsForValue()
        .get(refreshTokenKey(payload.tokenId))

      if (
        !payload.expiresAt.isAfter(Instant.now()) ||
        storedUserId != payload.userId.toString()
      ) {
        close(session, CloseStatus.POLICY_VIOLATION)
      }
    } catch (exception: Exception) {
      close(session, CloseStatus.SERVER_ERROR)
      throw exception
    }
  }

  fun unregister(session: WebSocketSession) {
    val payload = accessTokenPayload(session) ?: return

    sessionsByTokenId.computeIfPresent(payload.tokenId) { _, sessions ->
      (sessions - session.id).takeIf { it.isNotEmpty() }
    }
  }

  fun closeAll(tokenId: String) {
    val sessions = sessionsByTokenId[tokenId] ?: return

    sessions.values.forEach { session ->
      close(session, CloseStatus.POLICY_VIOLATION)
    }
  }

  private fun accessTokenPayload(session: WebSocketSession): AccessTokenPayload? {
    val authentication = session.principal as? Authentication
    return authentication?.details as? AccessTokenPayload
  }

  private fun close(session: WebSocketSession, status: CloseStatus) {
    try {
      if (session.isOpen) {
        session.close(status)
      }
    } catch (exception: Exception) {
      log.warn(
        "WebSocket 연결 종료 실패: sessionId={}",
        session.id,
        exception,
      )
    }
  }
}

package com.example.server.global.exception

import com.example.server.global.stomp.dto.StompCommandError
import com.example.server.global.stomp.dto.StompCommandFailure
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.messaging.Message
import org.springframework.messaging.handler.annotation.MessageExceptionHandler
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.bind.annotation.ControllerAdvice
import tools.jackson.databind.ObjectMapper
import java.nio.charset.StandardCharsets
import java.security.Principal
import java.util.UUID

data class StompRequestMetadata(val requestId: UUID, val action: String)

@ControllerAdvice
class StompExceptionHandler(private val messagingTemplateProvider: ObjectProvider<SimpMessagingTemplate>, private val objectMapper: ObjectMapper) {
  private val log = LoggerFactory.getLogger(StompExceptionHandler::class.java)
  private val syncDestinationPattern = Regex("^/api/([^/]+)/sync$")

  @MessageExceptionHandler(CustomException::class)
  fun handleCustomException(exception: CustomException, message: Message<*>, principal: Principal, headerAccessor: SimpMessageHeaderAccessor) {
    val request = readRequestMetadata(message) ?: return

    log.warn(
      "STOMP CustomException: requestId=[{}], action=[{}], code=[{}]",
      request.requestId,
      request.action,
      exception.errorCode.name,
    )

    sendFailure(
      principal = principal,
      destination = headerAccessor.destination,
      request = request,
      errorCode = exception.errorCode,
      message = exception.message,
    )
  }

  @MessageExceptionHandler(Exception::class)
  fun handleException(exception: Exception, message: Message<*>, principal: Principal, headerAccessor: SimpMessageHeaderAccessor) {
    val request = readRequestMetadata(message) ?: return

    log.error(
      "Unhandled STOMP exception: requestId=[{}], action=[{}]",
      request.requestId,
      request.action,
      exception,
    )

    sendFailure(
      principal = principal,
      destination = headerAccessor.destination,
      request = request,
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR,
      message = ErrorCode.INTERNAL_SERVER_ERROR.message,
    )
  }

  private fun readRequestMetadata(message: Message<*>): StompRequestMetadata? = runCatching {
    val payload = when (val value = message.payload) {
      is ByteArray -> String(value, StandardCharsets.UTF_8)
      is String -> value
      else -> objectMapper.writeValueAsString(value)
    }

    objectMapper.readValue(payload, StompRequestMetadata::class.java)
  }.onFailure { exception ->
    log.warn("STOMP 요청 공통 필드 파싱 실패", exception)
  }.getOrNull()

  private fun sendFailure(principal: Principal, destination: String?, request: StompRequestMetadata, errorCode: ErrorCode, message: String) {
    val domain = destination
      ?.let(syncDestinationPattern::matchEntire)
      ?.groupValues
      ?.get(1)
      ?: return

    messagingTemplateProvider.getObject().convertAndSendToUser(
      principal.name,
      "/queue/$domain",
      StompCommandFailure(
        requestId = request.requestId,
        action = request.action,
        error = StompCommandError(
          code = errorCode.name,
          message = message,
        ),
      ),
    )
  }
}

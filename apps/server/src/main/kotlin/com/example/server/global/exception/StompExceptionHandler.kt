package com.example.server.global.exception

import com.example.server.global.stomp.dto.StompCommandError
import com.example.server.global.stomp.dto.StompCommandFailure
import io.github.springwolf.core.asyncapi.annotations.AsyncMessage
import io.github.springwolf.core.asyncapi.annotations.AsyncOperation
import io.github.springwolf.core.asyncapi.annotations.AsyncPublisher
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.messaging.Message
import org.springframework.messaging.converter.MessageConversionException
import org.springframework.messaging.handler.annotation.MessageExceptionHandler
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.bind.annotation.ControllerAdvice
import tools.jackson.databind.ObjectMapper
import tools.jackson.databind.exc.InvalidTypeIdException
import tools.jackson.databind.exc.MismatchedInputException
import java.nio.charset.StandardCharsets
import java.security.Principal
import java.util.UUID

data class StompRequestMetadata(val requestId: UUID, val action: String)

@ControllerAdvice
class StompExceptionHandler(private val messagingTemplateProvider: ObjectProvider<SimpMessagingTemplate>, private val objectMapper: ObjectMapper) {
  private val log = LoggerFactory.getLogger(StompExceptionHandler::class.java)
  private val domainPattern = Regex("^/api/([^/]+)")

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
      sessionId = headerAccessor.sessionId,
      request = request,
      errorCode = exception.errorCode,
      message = exception.message,
    )
  }

  @MessageExceptionHandler(MethodArgumentNotValidException::class)
  fun handleMethodArgumentNotValidException(
    exception: MethodArgumentNotValidException,
    message: Message<*>,
    principal: Principal,
    headerAccessor: SimpMessageHeaderAccessor,
  ) {
    val request = readRequestMetadata(message) ?: return
    val validationMessage = exception.bindingResult
      ?.fieldErrors
      ?.joinToString(", ") { "${it.field}: ${it.defaultMessage}" }
      .orEmpty()
      .ifBlank { ErrorCode.BAD_REQUEST.message }

    log.warn(
      "STOMP MethodArgumentNotValidException: requestId=[{}], action=[{}], message=[{}]",
      request.requestId,
      request.action,
      validationMessage,
    )

    sendFailure(
      principal = principal,
      destination = headerAccessor.destination,
      sessionId = headerAccessor.sessionId,
      request = request,
      errorCode = ErrorCode.BAD_REQUEST,
      message = validationMessage,
    )
  }

  @MessageExceptionHandler(MessageConversionException::class)
  fun handleMessageConversionException(
    exception: MessageConversionException,
    message: Message<*>,
    principal: Principal,
    headerAccessor: SimpMessageHeaderAccessor,
  ) {
    val request = readRequestMetadata(message) ?: return
    val conversionMessage =
      when (val cause = exception.cause) {
        is InvalidTypeIdException -> "action 값 '${cause.typeId}'은 올바르지 않습니다."

        is MismatchedInputException -> {
          val field = cause.path.joinToString(".") { it.propertyName ?: "[${it.index}]" }
          when {
            field.isNotBlank() -> "$field 값이 없거나 형식이 올바르지 않습니다."

            else -> ErrorCode.BAD_REQUEST.message
          }
        }

        else -> ErrorCode.BAD_REQUEST.message
      }

    log.warn(
      "STOMP MessageConversionException: requestId=[{}], action=[{}], message=[{}]",
      request.requestId,
      request.action,
      conversionMessage,
    )

    sendFailure(
      principal = principal,
      destination = headerAccessor.destination,
      sessionId = headerAccessor.sessionId,
      request = request,
      errorCode = ErrorCode.BAD_REQUEST,
      message = conversionMessage,
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
      sessionId = headerAccessor.sessionId,
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

  @AsyncPublisher(
    operation = AsyncOperation(
      channelName = "/user/queue/{domain}",
      description = "STOMP 명령 처리 실패 결과를 요청 사용자에게 전달합니다.",
      payloadType = StompCommandFailure::class,
      message = AsyncMessage(
        messageId = "stomp-command-failure",
        name = "StompCommandFailure",
        title = "STOMP 명령 실패",
      ),
    ),
  )
  private fun sendFailure(
    principal: Principal,
    destination: String?,
    sessionId: String?,
    request: StompRequestMetadata,
    errorCode: ErrorCode,
    message: String,
  ) {
    val domain = destination
      ?.let(domainPattern::find)
      ?.groupValues
      ?.get(1)
      ?: return

    val failure = StompCommandFailure(
      requestId = request.requestId,
      action = request.action,
      error = StompCommandError(
        code = errorCode.name,
        message = message,
      ),
    )

    val headerAccessor = SimpMessageHeaderAccessor.create().apply {
      this.sessionId = sessionId
      setLeaveMutable(true)
    }

    messagingTemplateProvider.getObject().convertAndSendToUser(
      principal.name,
      "/queue/$domain",
      failure,
      headerAccessor.messageHeaders,
    )
  }
}

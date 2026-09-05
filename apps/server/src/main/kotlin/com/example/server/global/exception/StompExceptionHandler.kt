package com.example.server.global.exception

import com.example.server.global.stomp.dto.StompCommandError
import com.example.server.global.stomp.dto.StompCommandFailure
import com.example.server.global.stomp.dto.StompCommandRequest
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.ObjectProvider
import org.springframework.messaging.handler.annotation.MessageExceptionHandler
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.bind.annotation.ControllerAdvice
import java.security.Principal

@ControllerAdvice
class StompExceptionHandler(private val messagingTemplateProvider: ObjectProvider<SimpMessagingTemplate>) {
  private val log = LoggerFactory.getLogger(StompExceptionHandler::class.java)
  private val syncDestinationPattern = Regex("^/api/([^/]+)/sync$")

  @MessageExceptionHandler(CustomException::class)
  fun handleCustomException(
    exception: CustomException,
    request: StompCommandRequest<*>,
    principal: Principal,
    headerAccessor: SimpMessageHeaderAccessor,
  ) {
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
  fun handleException(exception: Exception, request: StompCommandRequest<*>, principal: Principal, headerAccessor: SimpMessageHeaderAccessor) {
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

  private fun sendFailure(principal: Principal, destination: String?, request: StompCommandRequest<*>, errorCode: ErrorCode, message: String) {
    val domain =
      destination
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
        error = StompCommandError(code = errorCode.name, message = message),
      ),
    )
  }
}

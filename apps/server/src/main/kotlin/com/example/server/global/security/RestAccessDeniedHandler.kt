package com.example.server.global.security

import com.example.server.global.exception.ErrorCode
import com.example.server.global.response.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.security.access.AccessDeniedException
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.nio.charset.StandardCharsets

@Component
class RestAccessDeniedHandler(private val objectMapper: ObjectMapper) : AccessDeniedHandler {
  private val log = LoggerFactory.getLogger(RestAccessDeniedHandler::class.java)

  override fun handle(request: HttpServletRequest, response: HttpServletResponse, accessDeniedException: AccessDeniedException) {
    response.status = ErrorCode.FORBIDDEN.status.value()
    response.contentType = MediaType.APPLICATION_JSON_VALUE
    response.characterEncoding = StandardCharsets.UTF_8.name()

    log.warn("RestAccessDeniedHandler: {}", accessDeniedException.message)

    objectMapper.writeValue(
      response.outputStream,
      ApiResponse.error(ErrorCode.FORBIDDEN),
    )
  }
}

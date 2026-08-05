package com.example.server.global.security

import com.example.server.global.exception.ErrorCode
import com.example.server.global.response.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.nio.charset.StandardCharsets

@Component
class RestAuthenticationEntryPoint(private val objectMapper: ObjectMapper) : AuthenticationEntryPoint {
  private val log = LoggerFactory.getLogger(RestAuthenticationEntryPoint::class.java)

  override fun commence(request: HttpServletRequest, response: HttpServletResponse, authenticationException: AuthenticationException) {
    response.status = ErrorCode.UNAUTHORIZED.status.value()
    response.contentType = MediaType.APPLICATION_JSON_VALUE
    response.characterEncoding = StandardCharsets.UTF_8.name()

    log.warn("RestAuthenticationEntryPoint: {}", authenticationException.message)

    objectMapper.writeValue(
      response.outputStream,
      ApiResponse.error(ErrorCode.UNAUTHORIZED),
    )
  }
}

package com.example.server.auth.security

import com.example.server.global.exception.ErrorCode
import com.example.server.global.response.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component
import tools.jackson.databind.ObjectMapper
import java.nio.charset.StandardCharsets

@Component
class RestAuthenticationEntryPoint(private val objectMapper: ObjectMapper) : AuthenticationEntryPoint {
  override fun commence(request: HttpServletRequest, response: HttpServletResponse, authException: AuthenticationException) {
    response.status = HttpStatus.UNAUTHORIZED.value()
    response.contentType = MediaType.APPLICATION_JSON_VALUE
    response.characterEncoding = StandardCharsets.UTF_8.name()

    objectMapper.writeValue(
      response.outputStream,
      ApiResponse.error(ErrorCode.UNAUTHORIZED),
    )
  }
}

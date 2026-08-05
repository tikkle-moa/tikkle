package com.example.server.global.security

import com.example.server.global.exception.ErrorCode
import com.example.server.global.response.ApiResponse
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.server.ServerHttpResponse
import org.springframework.stereotype.Component
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.DefaultCorsProcessor
import tools.jackson.databind.ObjectMapper

@Component
class RestCorsProcessor(private val objectMapper: ObjectMapper) : DefaultCorsProcessor() {
  private val log = LoggerFactory.getLogger(RestCorsProcessor::class.java)

  override fun processRequest(config: CorsConfiguration?, request: HttpServletRequest, response: HttpServletResponse): Boolean {
    val accepted = super.processRequest(config, request, response)

    if (!accepted) {
      log.warn(
        "RestCorsProcessor: Invalid CORS request - origin={}, method={}, uri={}",
        request.getHeader(HttpHeaders.ORIGIN),
        request.method,
        request.requestURI,
      )
    }

    return accepted
  }

  override fun rejectRequest(response: ServerHttpResponse) {
    response.setStatusCode(HttpStatus.FORBIDDEN)
    response.headers.contentType = MediaType.APPLICATION_JSON

    objectMapper.writeValue(
      response.body,
      ApiResponse.error(ErrorCode.FORBIDDEN),
    )
  }
}

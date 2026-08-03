package com.example.server.global.exception

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post

@WebMvcTest(ExceptionTestController::class)
@ActiveProfiles("test")
class GlobalExceptionHandlerTest {

  @Autowired
  lateinit var mockMvc: MockMvc

  @Test
  fun `CustomException - 에러 코드에 해당하는 HTTP 상태와 failure 응답을 반환한다`() {
    mockMvc.get("/api/test/exception/custom")
      .andExpect {
        status { isNotFound() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(404) }
      }
  }

  @Test
  fun `MethodArgumentNotValidException - 400 응답과 필드 오류 메시지를 반환한다`() {
    mockMvc.post("/api/test/exception/valid") {
      contentType = MediaType.APPLICATION_JSON
      content = """{"name":""}"""
    }.andExpect {
      status { isBadRequest() }
      jsonPath("$.success") { value(false) }
      jsonPath("$.error.code") { value(400) }
    }
  }

  @Test
  fun `MissingServletRequestParameterException - 400 응답과 파라미터 이름을 담은 메시지를 반환한다`() {
    mockMvc.get("/api/test/exception/missing-param")
      .andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
      }
  }

  @Test
  fun `MethodArgumentTypeMismatchException - 400 응답과 파라미터 이름을 담은 메시지를 반환한다`() {
    mockMvc.get("/api/test/exception/type-mismatch/not-a-number")
      .andExpect {
        status { isBadRequest() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(400) }
      }
  }

  @Test
  fun `HttpMessageNotReadableException - 잘못된 JSON 요청에 400 응답을 반환한다`() {
    mockMvc.post("/api/test/exception/json-parse") {
      contentType = MediaType.APPLICATION_JSON
      content = "{ invalid json }"
    }.andExpect {
      status { isBadRequest() }
      jsonPath("$.success") { value(false) }
      jsonPath("$.error.code") { value(400) }
    }
  }

  @Test
  fun `HttpRequestMethodNotSupportedException - 허용되지 않는 HTTP 메서드에 405 응답을 반환한다`() {
    mockMvc.post("/api/test/exception/custom")
      .andExpect {
        status { isMethodNotAllowed() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(405) }
      }
  }

  @Test
  fun `HttpMediaTypeNotSupportedException - 지원되지 않는 Content-Type에 415 응답을 반환한다`() {
    mockMvc.post("/api/test/exception/valid") {
      contentType = MediaType.TEXT_PLAIN
      content = "plain text"
    }.andExpect {
      status { isUnsupportedMediaType() }
      jsonPath("$.success") { value(false) }
      jsonPath("$.error.code") { value(415) }
    }
  }

  @Test
  fun `NoResourceFoundException - 존재하지 않는 경로에 404 응답을 반환한다`() {
    mockMvc.get("/api/test/exception/nonexistent-path")
      .andExpect {
        status { isNotFound() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(404) }
      }
  }

  @Test
  fun `DataIntegrityViolationException - DB 제약 조건 위반에 409 응답을 반환한다`() {
    mockMvc.get("/api/test/exception/data-integrity")
      .andExpect {
        status { isConflict() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(409) }
      }
  }

  @Test
  fun `처리되지 않은 Exception - 500 응답을 반환한다`() {
    mockMvc.get("/api/test/exception/server-error")
      .andExpect {
        status { isInternalServerError() }
        jsonPath("$.success") { value(false) }
        jsonPath("$.error.code") { value(500) }
      }
  }
}

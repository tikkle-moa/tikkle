package com.example.server.global.exception

import com.example.server.global.response.ApiResponse
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.HttpMediaTypeNotSupportedException
import org.springframework.web.HttpRequestMethodNotSupportedException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.MissingServletRequestParameterException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException

@RestControllerAdvice
class GlobalExceptionHandler {
  private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

  /** 비즈니스 로직 예외 */
  @ExceptionHandler(CustomException::class)
  fun handleCustomException(e: CustomException): ResponseEntity<ApiResponse.Failure> {
    log.warn("CustomException: [{}] {}", e.errorCode.name, e.message)
    return ResponseEntity
      .status(e.errorCode.status)
      .body(ApiResponse.error(e.errorCode, e.message))
  }

  /** @Valid / @Validated Bean Validation 실패 */
  @ExceptionHandler(MethodArgumentNotValidException::class)
  fun handleMethodArgumentNotValidException(e: MethodArgumentNotValidException): ResponseEntity<ApiResponse.Failure> {
    val message =
      e.bindingResult.fieldErrors
        .joinToString(", ") { "${it.field}: ${it.defaultMessage}" }
        .ifBlank { ErrorCode.BAD_REQUEST.message }
    log.warn("MethodArgumentNotValidException: {}", message)
    return ResponseEntity
      .status(ErrorCode.BAD_REQUEST.status)
      .body(ApiResponse.error(ErrorCode.BAD_REQUEST, message))
  }

  /** 경로 변수 / 쿼리 파라미터 Bean Validation 실패 */
  @ExceptionHandler(ConstraintViolationException::class)
  fun handleConstraintViolationException(e: ConstraintViolationException): ResponseEntity<ApiResponse.Failure> {
    val message =
      e.constraintViolations
        .joinToString(", ") { it.message }
        .ifBlank { ErrorCode.BAD_REQUEST.message }
    log.warn("ConstraintViolationException: {}", message)
    return ResponseEntity
      .status(ErrorCode.BAD_REQUEST.status)
      .body(ApiResponse.error(ErrorCode.BAD_REQUEST, message))
  }

  /** 필수 요청 파라미터 누락 */
  @ExceptionHandler(MissingServletRequestParameterException::class)
  fun handleMissingServletRequestParameterException(e: MissingServletRequestParameterException): ResponseEntity<ApiResponse.Failure> {
    val message = "${e.parameterName}: 필수 파라미터가 누락되었습니다."
    log.warn("MissingServletRequestParameterException: {}", message)
    return ResponseEntity
      .status(ErrorCode.BAD_REQUEST.status)
      .body(ApiResponse.error(ErrorCode.BAD_REQUEST, message))
  }

  /** 경로 변수 / 쿼리 파라미터 타입 변환 실패 */
  @ExceptionHandler(MethodArgumentTypeMismatchException::class)
  fun handleMethodArgumentTypeMismatchException(e: MethodArgumentTypeMismatchException): ResponseEntity<ApiResponse.Failure> {
    val message = "${e.name}: 잘못된 타입의 값입니다."
    log.warn("MethodArgumentTypeMismatchException: {}", message)
    return ResponseEntity
      .status(ErrorCode.BAD_REQUEST.status)
      .body(ApiResponse.error(ErrorCode.BAD_REQUEST, message))
  }

  /** 요청 JSON 파싱 실패 */
  @ExceptionHandler(HttpMessageNotReadableException::class)
  fun handleHttpMessageNotReadableException(e: HttpMessageNotReadableException): ResponseEntity<ApiResponse.Failure> {
    log.warn("HttpMessageNotReadableException: {}", e.message)
    return ResponseEntity
      .status(ErrorCode.BAD_REQUEST.status)
      .body(ApiResponse.error(ErrorCode.BAD_REQUEST))
  }

  /** 지원하지 않는 HTTP 메서드 */
  @ExceptionHandler(HttpRequestMethodNotSupportedException::class)
  fun handleHttpRequestMethodNotSupportedException(e: HttpRequestMethodNotSupportedException): ResponseEntity<ApiResponse.Failure> {
    log.warn("HttpRequestMethodNotSupportedException: {}", e.message)
    return ResponseEntity
      .status(ErrorCode.METHOD_NOT_ALLOWED.status)
      .body(ApiResponse.error(ErrorCode.METHOD_NOT_ALLOWED))
  }

  /** 지원하지 않는 미디어 타입 */
  @ExceptionHandler(HttpMediaTypeNotSupportedException::class)
  fun handleHttpMediaTypeNotSupportedException(e: HttpMediaTypeNotSupportedException): ResponseEntity<ApiResponse.Failure> {
    log.warn("HttpMediaTypeNotSupportedException: {}", e.message)
    return ResponseEntity
      .status(ErrorCode.UNSUPPORTED_MEDIA_TYPE.status)
      .body(ApiResponse.error(ErrorCode.UNSUPPORTED_MEDIA_TYPE))
  }

  /** 존재하지 않는 리소스 요청 (404) */
  @ExceptionHandler(NoResourceFoundException::class)
  fun handleNoResourceFoundException(e: NoResourceFoundException): ResponseEntity<ApiResponse.Failure> {
    log.warn("NoResourceFoundException: {}", e.message)
    return ResponseEntity
      .status(ErrorCode.NOT_FOUND.status)
      .body(ApiResponse.error(ErrorCode.NOT_FOUND))
  }

  /** DB 무결성 제약 조건 위반 (409) */
  @ExceptionHandler(DataIntegrityViolationException::class)
  fun handleDataIntegrityViolationException(e: DataIntegrityViolationException): ResponseEntity<ApiResponse.Failure> {
    log.warn("DataIntegrityViolationException: {}", e.message)
    return ResponseEntity
      .status(ErrorCode.CONFLICT.status)
      .body(ApiResponse.error(ErrorCode.CONFLICT))
  }

  /** 처리되지 않은 예외 */
  @ExceptionHandler(Exception::class)
  fun handleException(e: Exception): ResponseEntity<ApiResponse.Failure> {
    log.error("Unhandled exception", e)
    return ResponseEntity
      .status(ErrorCode.INTERNAL_SERVER_ERROR.status)
      .body(ApiResponse.error(ErrorCode.INTERNAL_SERVER_ERROR))
  }
}

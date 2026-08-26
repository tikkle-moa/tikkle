package com.example.server.performance

import com.example.server.global.exception.ErrorCode
import com.example.server.global.openapi.ErrorResponse
import com.example.server.global.openapi.ErrorResponseItem
import com.example.server.global.response.ApiResponse
import com.example.server.performance.dto.CreatePerformanceRequest
import com.example.server.performance.dto.PerformanceDetailResponse
import com.example.server.performance.dto.PerformanceResponse
import com.example.server.performance.dto.UpdatePerformanceRequest
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import io.swagger.v3.oas.annotations.responses.ApiResponse as SwaggerApiResponse

@RestController
@RequestMapping("/performances")
class PerformanceController(private val performanceService: PerformanceService) {
  @Operation(
    summary = "공연 회차 상세 조회",
    description = "공연 회차의 상세 정보를 반환합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연 회차 상세 조회 성공")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연 회차를 찾을 수 없음"),
    ],
  )
  @GetMapping("/{id}")
  fun getPerformance(@PathVariable id: Long): ResponseEntity<ApiResponse.Success<PerformanceDetailResponse>> {
    val performanceResponse = performanceService.getPerformance(id)

    return ResponseEntity.ok(ApiResponse.ok(performanceResponse))
  }

  @Operation(
    summary = "공연 회차 생성",
    description = "새로운 공연 회차를 생성합니다.",
    responses = [SwaggerApiResponse(responseCode = "201", description = "공연 회차 생성 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "콘서트를 찾을 수 없음"),
    ],
  )
  @PostMapping
  fun create(@Valid @RequestBody createPerformanceRequest: CreatePerformanceRequest): ResponseEntity<ApiResponse.Success<PerformanceResponse>> {
    val performanceResponse = performanceService.create(createPerformanceRequest)

    return ResponseEntity.status(HttpStatus.CREATED)
      .body(ApiResponse.ok(performanceResponse))
  }

  @Operation(
    summary = "공연 회차 수정",
    description = "기존 공연 회차 정보를 수정합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연 회차 수정 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연 회차 또는 콘서트를 찾을 수 없음"),
    ],
  )
  @PatchMapping("/{id}")
  fun update(
    @PathVariable id: Long,
    @Valid @RequestBody updatePerformanceRequest: UpdatePerformanceRequest,
  ): ResponseEntity<ApiResponse.Success<PerformanceResponse>> {
    val performanceResponse = performanceService.update(id, updatePerformanceRequest)

    return ResponseEntity.ok(ApiResponse.ok(performanceResponse))
  }

  @Operation(
    summary = "공연 회차 삭제",
    description = "기존 공연 회차를 삭제합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연 회차 삭제 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연 회차를 찾을 수 없음"),
    ],
  )
  @DeleteMapping("/{id}")
  fun delete(@PathVariable id: Long): ResponseEntity<ApiResponse.EmptySuccess> {
    performanceService.delete(id)

    return ResponseEntity.ok(ApiResponse.ok())
  }
}

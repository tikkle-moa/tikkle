package com.example.server.concert

import com.example.server.concert.dto.ConcertDetailResponse
import com.example.server.concert.dto.ConcertListResponse
import com.example.server.concert.dto.ConcertResponse
import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.dto.UpdateConcertRequest
import com.example.server.global.exception.ErrorCode
import com.example.server.global.openapi.ErrorResponse
import com.example.server.global.openapi.ErrorResponseItem
import com.example.server.global.response.ApiResponse
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
@RequestMapping("/concerts")
class ConcertController(private val concertService: ConcertService) {
  @Operation(
    summary = "콘서트 생성",
    description = "새로운 콘서트를 생성합니다.",
    responses = [SwaggerApiResponse(responseCode = "201", description = "콘서트 생성 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
    ],
  )
  @PostMapping
  fun create(@Valid @RequestBody createConcertRequest: CreateConcertRequest): ResponseEntity<ApiResponse.Success<ConcertResponse>> {
    val concertResponse = concertService.create(createConcertRequest)
    return ResponseEntity.status(HttpStatus.CREATED)
      .body(ApiResponse.ok(concertResponse))
  }

  @Operation(
    summary = "콘서트 수정",
    description = "기존 콘서트 정보를 수정합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "콘서트 수정 성공")],
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
  @PatchMapping("/{id}")
  fun update(
    @PathVariable id: Long,
    @Valid @RequestBody updateConcertRequest: UpdateConcertRequest,
  ): ResponseEntity<ApiResponse.Success<ConcertResponse>> {
    val concertResponse = concertService.update(id, updateConcertRequest)
    return ResponseEntity.ok(ApiResponse.ok(concertResponse))
  }

  @Operation(
    summary = "콘서트 삭제",
    description = "기존 콘서트를 삭제합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "콘서트 삭제 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "콘서트를 찾을 수 없음"),
    ],
  )
  @DeleteMapping("/{id}")
  fun delete(@PathVariable id: Long): ResponseEntity<ApiResponse.EmptySuccess> {
    concertService.delete(id)
    return ResponseEntity.ok(ApiResponse.ok())
  }

  @Operation(
    summary = "콘서트 목록 조회",
    description = "최신 생성순으로 콘서트 목록을 반환합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "콘서트 목록 조회 성공")],
  )
  @GetMapping
  fun getConcerts(): ResponseEntity<ApiResponse.Success<List<ConcertListResponse>>> {
    val concertListResponse = concertService.getConcerts()

    return ResponseEntity.ok(ApiResponse.ok(concertListResponse))
  }

  @Operation(
    summary = "콘서트 상세 조회",
    description = "콘서트 상세 정보와 예정 회차를 우선으로 정렬한 공연 회차 목록을 반환합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "콘서트 상세 조회 성공")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "콘서트를 찾을 수 없음"),
    ],
  )
  @GetMapping("/{id}")
  fun getConcertDetail(@PathVariable id: Long): ResponseEntity<ApiResponse.Success<ConcertDetailResponse>> {
    val response = concertService.getConcertDetail(id)

    return ResponseEntity.ok(ApiResponse.ok(response))
  }
}

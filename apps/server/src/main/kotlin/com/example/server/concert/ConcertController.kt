package com.example.server.concert

import com.example.server.concert.dto.ConcertResponse
import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.dto.UpdateConcertRequest
import com.example.server.global.response.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.media.Content
import io.swagger.v3.oas.annotations.media.Schema
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
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
    responses = [
      SwaggerApiResponse(responseCode = "201", description = "콘서트 생성 성공"),
      SwaggerApiResponse(
        responseCode = "400",
        description = "잘못된 요청",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
      SwaggerApiResponse(
        responseCode = "401",
        description = "인증 실패",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
      SwaggerApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
    ],
    security = [SecurityRequirement(name = "access_token")],
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
    responses = [
      SwaggerApiResponse(responseCode = "200", description = "콘서트 수정 성공"),
      SwaggerApiResponse(
        responseCode = "400",
        description = "잘못된 요청",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
      SwaggerApiResponse(
        responseCode = "401",
        description = "인증 실패",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
      SwaggerApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
      SwaggerApiResponse(
        responseCode = "404",
        description = "콘서트를 찾을 수 없음",
        content = [Content(schema = Schema(implementation = ApiResponse.Failure::class))],
      ),
    ],
    security = [SecurityRequirement(name = "access_token")],
  )
  @PatchMapping("/{id}")
  fun update(@PathVariable id: Long, @RequestBody updateConcertRequest: UpdateConcertRequest): ResponseEntity<ApiResponse.Success<ConcertResponse>> {
    val concertResponse = concertService.update(id, updateConcertRequest)
    return ResponseEntity.ok(ApiResponse.ok(concertResponse))
  }
}

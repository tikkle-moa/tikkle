package com.example.server.venue

import com.example.server.global.exception.ErrorCode
import com.example.server.global.openapi.ErrorResponse
import com.example.server.global.openapi.ErrorResponseItem
import com.example.server.global.response.ApiResponse
import com.example.server.venue.dto.CreateVenueDetailRequest
import com.example.server.venue.dto.UpdateVenueDetailRequest
import com.example.server.venue.dto.VenueDetailResponse
import com.example.server.venue.dto.VenueResponse
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
@RequestMapping("/venues")
class VenueController(private val venueService: VenueService) {
  @Operation(
    summary = "공연장 목록 조회",
    description = "공연장 목록을 조회합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연장 목록 조회 성공")],
  )
  @GetMapping
  fun getAllVenues(): ResponseEntity<ApiResponse.Success<List<VenueResponse>>> {
    val venues = venueService.getAllVenues()

    return ResponseEntity.ok(ApiResponse.ok(venues))
  }

  @Operation(
    summary = "공연장 상세 조회",
    description = "공연장과 좌석 정보를 조회합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연장 상세 조회 성공")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연장을 찾을 수 없음"),
    ],
  )
  @GetMapping("/{id}")
  fun getVenueDetails(@PathVariable id: Long): ResponseEntity<ApiResponse.Success<VenueDetailResponse>> {
    val seatListResponse = venueService.getVenueDetails(id)

    return ResponseEntity.ok(ApiResponse.ok(seatListResponse))
  }

  @Operation(
    summary = "공연장 생성",
    description = "공연장과 좌석을 생성합니다.",
    responses = [SwaggerApiResponse(responseCode = "201", description = "공연장 생성 성공")],
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
  fun createVenueDetails(@Valid @RequestBody request: CreateVenueDetailRequest): ResponseEntity<ApiResponse.Success<VenueDetailResponse>> {
    val seatResponses = venueService.createVenueDetails(request)

    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(seatResponses))
  }

  @Operation(
    summary = "공연장 일괄 생성 / 수정 / 삭제",
    description = "공연장과 좌석을 일괄적으로 생성, 수정, 삭제합니다. 요청에 포함된 좌석 정보는 공연장에 대한 좌석 정보를 완전히 대체합니다. 즉, 요청에 포함되지 않은 좌석은 삭제됩니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연장 일괄 생성 / 수정 / 삭제 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연장 또는 좌석을 찾을 수 없음"),
    ],
  )
  @PatchMapping("/{id}")
  fun updateVenueDetails(
    @PathVariable id: Long,
    @Valid @RequestBody request: UpdateVenueDetailRequest,
  ): ResponseEntity<ApiResponse.Success<VenueDetailResponse>> {
    val seatResponses = venueService.updateVenueDetails(id, request)

    return ResponseEntity.ok(ApiResponse.ok(seatResponses))
  }

  @Operation(
    summary = "공연장 삭제",
    description = "공연장과 좌석을 삭제합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "공연장 삭제 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연장을 찾을 수 없음"),
      ErrorResponseItem(ErrorCode.CONFLICT, description = "공연이 등록된 공연장"),
    ],
  )
  @DeleteMapping("/{id}")
  fun deleteVenue(@PathVariable id: Long): ResponseEntity<ApiResponse.EmptySuccess> {
    venueService.deleteVenue(id)
    return ResponseEntity.ok(ApiResponse.ok())
  }
}

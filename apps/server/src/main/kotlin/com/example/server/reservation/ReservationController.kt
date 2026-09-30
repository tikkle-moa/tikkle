package com.example.server.reservation

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.ErrorCode
import com.example.server.global.openapi.ErrorResponse
import com.example.server.global.openapi.ErrorResponseItem
import com.example.server.global.response.ApiResponse
import com.example.server.reservation.dto.MyReservationResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import io.swagger.v3.oas.annotations.responses.ApiResponse as SwaggerApiResponse

@RestController
@RequestMapping("/reservations")
class ReservationController(private val reservationService: ReservationService) {
  @Operation(
    summary = "내 예매 목록 조회",
    description = "로그인한 사용자의 예매를 예매 시각 내림차순으로 반환합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "예매 목록 조회 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [ErrorResponseItem(ErrorCode.UNAUTHORIZED)],
  )
  @GetMapping
  fun getMyReservations(@AuthenticationPrincipal loginUser: LoginUserResult): ResponseEntity<ApiResponse.Success<List<MyReservationResponse>>> =
    ResponseEntity.ok(ApiResponse.ok(reservationService.getMyReservations(loginUser.userId)))

  @Operation(
    summary = "내 예매 상세 조회",
    description = "예매의 공연·회차·공연장·좌석·금액·상태 정보를 반환합니다.",
    responses = [SwaggerApiResponse(responseCode = "200", description = "예매 상세 조회 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN, description = "다른 사용자의 예매"),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "예매 내역을 찾을 수 없음"),
    ],
  )
  @GetMapping("/{reservationId}")
  fun getMyReservation(
    @PathVariable reservationId: Long,
    @AuthenticationPrincipal loginUser: LoginUserResult,
  ): ResponseEntity<ApiResponse.Success<MyReservationResponse>> =
    ResponseEntity.ok(ApiResponse.ok(reservationService.getMyReservation(loginUser.userId, reservationId)))
}

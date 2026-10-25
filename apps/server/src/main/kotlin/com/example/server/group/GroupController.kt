package com.example.server.group

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.ErrorCode
import com.example.server.global.openapi.ErrorResponse
import com.example.server.global.openapi.ErrorResponseItem
import com.example.server.global.response.ApiResponse
import com.example.server.global.security.WebSocketSessionRegistry
import com.example.server.group.dto.CreateGroupRequest
import com.example.server.group.dto.GroupMembershipData
import com.example.server.group.dto.JoinGroupRequest
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import io.swagger.v3.oas.annotations.responses.ApiResponse as SwaggerApiResponse

@RestController
@RequestMapping("/groups")
@Validated
class GroupController(private val groupService: GroupService, private val webSocketSessionRegistry: WebSocketSessionRegistry) {
  @Operation(
    summary = "그룹 및 멤버 목록 조회",
    responses = [SwaggerApiResponse(responseCode = "200", description = "그룹 조회 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN, description = "활성 그룹 구성원이 아님"),
      ErrorResponseItem(ErrorCode.NOT_FOUND),
    ],
  )
  @GetMapping("/{groupId}")
  fun getGroup(
    @PathVariable("groupId") @Positive groupId: Long,
    @AuthenticationPrincipal loginUser: LoginUserResult,
  ): ResponseEntity<ApiResponse.Success<GroupMembershipData>> = ResponseEntity.ok(ApiResponse.ok(groupService.getGroup(loginUser.userId, groupId)))

  @Operation(
    summary = "공연 그룹 생성",
    responses = [SwaggerApiResponse(responseCode = "201", description = "그룹 생성 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.CONFLICT, description = "이미 같은 공연의 활성 그룹에 참여 중이거나 공연이 시작됨"),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "공연 회차를 찾을 수 없음"),
    ],
  )
  @PostMapping
  fun createGroup(
    @Valid @RequestBody request: CreateGroupRequest,
    @AuthenticationPrincipal loginUser: LoginUserResult,
  ): ResponseEntity<ApiResponse.Success<GroupMembershipData>> {
    val result = groupService.createGroup(loginUser.userId, request.performanceId)

    return ResponseEntity.status(HttpStatus.CREATED)
      .body(ApiResponse.ok(result))
  }

  @Operation(
    summary = "초대 코드로 그룹 참여",
    responses = [SwaggerApiResponse(responseCode = "200", description = "그룹 참여 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND, description = "그룹 또는 초대 코드를 찾을 수 없음"),
      ErrorResponseItem(ErrorCode.CONFLICT, description = "만료·정원 초과·중복 가입"),
    ],
  )
  @PostMapping("/{groupId}/join")
  fun joinGroup(
    @PathVariable("groupId") @Positive groupId: Long,
    @Valid @RequestBody request: JoinGroupRequest,
    @AuthenticationPrincipal loginUser: LoginUserResult,
  ): ResponseEntity<ApiResponse.Success<GroupMembershipData>> {
    val result = groupService.joinGroup(loginUser.userId, groupId, request.inviteCode)

    return ResponseEntity.ok(ApiResponse.ok(result))
  }

  @Operation(
    summary = "그룹 탈퇴",
    responses = [SwaggerApiResponse(responseCode = "200", description = "그룹 탈퇴 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND),
    ],
  )
  @DeleteMapping("/{groupId}/leave")
  fun leaveGroup(
    @PathVariable("groupId") @Positive groupId: Long,
    @AuthenticationPrincipal loginUser: LoginUserResult,
  ): ResponseEntity<ApiResponse.Success<GroupMembershipData>> {
    val result = groupService.leaveGroup(loginUser.userId, groupId)
    webSocketSessionRegistry.closeUserSessions(loginUser.userId)

    return ResponseEntity.ok(ApiResponse.ok(result))
  }

  @Operation(
    summary = "그룹 멤버 강퇴",
    responses = [SwaggerApiResponse(responseCode = "200", description = "그룹 멤버 강퇴 성공")],
    security = [SecurityRequirement(name = "access_token")],
  )
  @ErrorResponse(
    responses = [
      ErrorResponseItem(ErrorCode.BAD_REQUEST),
      ErrorResponseItem(ErrorCode.UNAUTHORIZED),
      ErrorResponseItem(ErrorCode.FORBIDDEN),
      ErrorResponseItem(ErrorCode.NOT_FOUND),
      ErrorResponseItem(ErrorCode.CONFLICT),
    ],
  )
  @DeleteMapping("/{groupId}/members/{memberUserId}")
  fun kickMember(
    @PathVariable("groupId") @Positive groupId: Long,
    @PathVariable("memberUserId") @Positive memberUserId: Long,
    @AuthenticationPrincipal loginUser: LoginUserResult,
  ): ResponseEntity<ApiResponse.Success<GroupMembershipData>> {
    val result = groupService.kickMember(loginUser.userId, groupId, memberUserId)
    webSocketSessionRegistry.closeUserSessions(memberUserId)

    return ResponseEntity.ok(ApiResponse.ok(result))
  }
}

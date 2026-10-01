package com.example.server.group

import com.example.server.auth.dto.LoginUserResult
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.group.dto.GroupChatCommand
import jakarta.validation.Valid
import org.springframework.messaging.handler.annotation.MessageMapping
import org.springframework.messaging.handler.annotation.Payload
import org.springframework.security.core.Authentication
import org.springframework.stereotype.Controller

@Controller
@MessageMapping("/groups")
class GroupStompController(private val groupService: GroupService, private val groupStompPublisher: GroupStompPublisher) {
  @MessageMapping("/chat")
  fun sendGroupChatMessage(@Payload @Valid command: GroupChatCommand, authentication: Authentication) {
    val user = loginUser(authentication)
    val result = groupService.createGroupChatMessage(user.userId, command.data)

    groupStompPublisher.publishGroupChatMessage(result.groupId, result)
  }

  private fun loginUser(authentication: Authentication): LoginUserResult = authentication.principal as? LoginUserResult
    ?: throw CustomException(ErrorCode.UNAUTHORIZED, "로그인이 필요합니다.")
}

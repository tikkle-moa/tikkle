package com.example.server.group

import com.example.server.group.dto.GroupChatEvent
import com.example.server.group.dto.GroupChatEventData
import io.github.springwolf.bindings.stomp.annotations.StompAsyncOperationBinding
import io.github.springwolf.core.asyncapi.annotations.AsyncOperation
import io.github.springwolf.core.asyncapi.annotations.AsyncPublisher
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class GroupStompPublisher(private val messagingTemplate: SimpMessagingTemplate) {
  @AsyncPublisher(
    operation = AsyncOperation(
      channelName = "/topic/groups/{groupId}/chat",
      payloadType = GroupChatEvent::class,
    ),
  )
  @StompAsyncOperationBinding
  fun publishGroupChatMessage(groupId: Long, event: GroupChatEventData) {
    messagingTemplate.convertAndSend(
      "/topic/groups/$groupId/chat",
      GroupChatEvent(data = event),
    )
  }
}

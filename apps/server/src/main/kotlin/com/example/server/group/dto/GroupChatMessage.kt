package com.example.server.group.dto

import com.example.server.global.stomp.StompSuccessMessage
import java.util.UUID

data class GroupChatMessage(override val requestId: UUID, override val data: GroupChatEventData) : StompSuccessMessage<GroupChatEventData>

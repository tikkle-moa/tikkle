package com.example.server.group

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Lazy
import org.springframework.context.event.EventListener
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessageType
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.messaging.support.MessageBuilder
import org.springframework.stereotype.Component
import org.springframework.web.socket.messaging.SessionDisconnectEvent
import java.util.concurrent.ConcurrentHashMap

@Component
class GroupChatSubscriptionRegistry(@Lazy @Qualifier("clientInboundChannel") private val clientInboundChannel: MessageChannel) : ChannelInterceptor {
  private val subscriptions = ConcurrentHashMap<SubscriptionKey, GroupChatSubscription>()

  fun registerIfMember(userId: Long, groupId: Long, sessionId: String?, subscriptionId: String?, isActiveMember: () -> Boolean): Boolean {
    if (sessionId == null || subscriptionId == null) return false

    return synchronized(subscriptions) {
      if (!isActiveMember()) return@synchronized false

      subscriptions[SubscriptionKey(sessionId, subscriptionId)] =
        GroupChatSubscription(userId = userId, groupId = groupId, revoked = false)
      true
    }
  }

  fun unsubscribeGroupChat(userId: Long, groupId: Long) {
    val subscriptionKeys = synchronized(subscriptions) {
      subscriptions.entries
        .filter { (_, subscription) -> subscription.userId == userId && subscription.groupId == groupId }
        .onEach { (key, subscription) -> subscriptions[key] = subscription.copy(revoked = true) }
        .map { it.key }
    }

    subscriptionKeys.forEach(::sendUnsubscribe)
  }

  fun unregister(sessionId: String?, subscriptionId: String?) {
    if (sessionId == null || subscriptionId == null) return
    subscriptions.remove(SubscriptionKey(sessionId, subscriptionId))
  }

  @EventListener
  fun onSessionDisconnect(event: SessionDisconnectEvent) {
    val sessionId = SimpMessageHeaderAccessor.getSessionId(event.message.headers) ?: return
    subscriptions.keys.removeIf { it.sessionId == sessionId }
  }

  override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? {
    val accessor = SimpMessageHeaderAccessor.wrap(message)
    if (accessor.messageType != SimpMessageType.MESSAGE) return message
    if (GROUP_CHAT_DESTINATION.matchEntire(accessor.destination.orEmpty()) == null) return message

    val sessionId = accessor.sessionId ?: return message
    val subscriptionId = accessor.subscriptionId ?: return message
    val subscription = subscriptions[SubscriptionKey(sessionId, subscriptionId)]
    return if (subscription?.revoked == true) null else message
  }

  private fun sendUnsubscribe(key: SubscriptionKey) {
    val headers = SimpMessageHeaderAccessor.create(SimpMessageType.UNSUBSCRIBE).apply {
      sessionId = key.sessionId
      subscriptionId = key.subscriptionId
      setHeader(SERVER_REVOCATION_HEADER, true)
      setLeaveMutable(true)
    }

    clientInboundChannel.send(MessageBuilder.createMessage(ByteArray(0), headers.messageHeaders))
  }

  private data class SubscriptionKey(val sessionId: String, val subscriptionId: String)

  private data class GroupChatSubscription(val userId: Long, val groupId: Long, val revoked: Boolean)

  companion object {
    const val SERVER_REVOCATION_HEADER = "groupChatRevocation"

    private val GROUP_CHAT_DESTINATION = Regex("^/topic/groups/[^/]+/chat$")
  }
}

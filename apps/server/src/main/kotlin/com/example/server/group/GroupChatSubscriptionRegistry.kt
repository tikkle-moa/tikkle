package com.example.server.group

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Lazy
import org.springframework.context.event.EventListener
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.MessageHandler
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessageType
import org.springframework.messaging.support.ExecutorChannelInterceptor
import org.springframework.messaging.support.MessageBuilder
import org.springframework.stereotype.Component
import org.springframework.transaction.support.TransactionSynchronization
import org.springframework.transaction.support.TransactionSynchronizationManager
import org.springframework.web.socket.messaging.SessionDisconnectEvent
import java.util.concurrent.ConcurrentHashMap

@Component
class GroupChatSubscriptionRegistry(@Lazy @Qualifier("clientInboundChannel") private val clientInboundChannel: MessageChannel) :
  ExecutorChannelInterceptor {
  private val subscriptions = ConcurrentHashMap<SubscriptionKey, GroupChatSubscription>()
  private val pendingRevocations = ConcurrentHashMap.newKeySet<MembershipKey>()

  fun registerIfMember(userId: Long, groupId: Long, sessionId: String?, subscriptionId: String?, isActiveMember: () -> Boolean): Boolean {
    if (sessionId == null || subscriptionId == null) return false

    return synchronized(subscriptions) {
      if (MembershipKey(userId, groupId) in pendingRevocations) return@synchronized false
      if (!isActiveMember()) return@synchronized false

      subscriptions[SubscriptionKey(sessionId, subscriptionId)] =
        GroupChatSubscription(userId = userId, groupId = groupId, revoked = false)
      true
    }
  }

  fun revokeGroupChat(userId: Long, groupId: Long) {
    val membershipKey = MembershipKey(userId, groupId)
    val subscriptionKeys = synchronized(subscriptions) {
      pendingRevocations.add(membershipKey)
      subscriptions.entries
        .filter { (_, subscription) -> subscription.userId == userId && subscription.groupId == groupId }
        .onEach { (key, subscription) -> subscriptions[key] = subscription.copy(revoked = true) }
        .map { it.key }
    }

    if (!TransactionSynchronizationManager.isSynchronizationActive()) {
      completeRevocation(membershipKey, subscriptionKeys)
      return
    }

    TransactionSynchronizationManager.registerSynchronization(
      object : TransactionSynchronization {
        override fun afterCommit() {
          completeRevocation(membershipKey, subscriptionKeys)
        }

        override fun afterCompletion(status: Int) {
          when (status) {
            TransactionSynchronization.STATUS_ROLLED_BACK -> rollbackRevocation(membershipKey, subscriptionKeys)
            TransactionSynchronization.STATUS_UNKNOWN -> pendingRevocations.remove(membershipKey)
          }
        }
      },
    )
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

  override fun preSend(message: Message<*>, channel: MessageChannel): Message<*>? = if (isRevoked(message)) null else message

  override fun beforeHandle(message: Message<*>, channel: MessageChannel, handler: MessageHandler): Message<*>? =
    if (isRevoked(message)) null else message

  private fun isRevoked(message: Message<*>): Boolean {
    val accessor = SimpMessageHeaderAccessor.wrap(message)
    if (accessor.messageType != SimpMessageType.MESSAGE) return false
    if (GROUP_CHAT_DESTINATION.matchEntire(accessor.destination.orEmpty()) == null) return false

    val sessionId = accessor.sessionId ?: return false
    val subscriptionId = accessor.subscriptionId ?: return false
    val subscription = subscriptions[SubscriptionKey(sessionId, subscriptionId)] ?: return true
    return subscription.revoked
  }

  private fun completeRevocation(membershipKey: MembershipKey, subscriptionKeys: List<SubscriptionKey>) {
    try {
      subscriptionKeys.forEach(::sendUnsubscribe)
    } finally {
      synchronized(subscriptions) {
        pendingRevocations.remove(membershipKey)
      }
    }
  }

  private fun rollbackRevocation(membershipKey: MembershipKey, subscriptionKeys: List<SubscriptionKey>) {
    synchronized(subscriptions) {
      pendingRevocations.remove(membershipKey)
      subscriptionKeys.forEach { key ->
        subscriptions.computeIfPresent(key) { _, subscription -> subscription.copy(revoked = false) }
      }
    }
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

  private data class MembershipKey(val userId: Long, val groupId: Long)

  private data class SubscriptionKey(val sessionId: String, val subscriptionId: String)

  private data class GroupChatSubscription(val userId: Long, val groupId: Long, val revoked: Boolean)

  companion object {
    const val SERVER_REVOCATION_HEADER = "groupChatRevocation"

    private val GROUP_CHAT_DESTINATION = Regex("^/topic/groups/[^/]+/chat$")
  }
}

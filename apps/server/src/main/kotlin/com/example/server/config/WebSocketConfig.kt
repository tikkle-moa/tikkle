package com.example.server.config

import com.example.server.config.properties.AppProperties
import com.example.server.global.security.StompAuthenticationChannelInterceptor
import com.example.server.global.security.WebSocketSessionRegistry
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.CloseStatus
import org.springframework.web.socket.WebSocketSession
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration
import org.springframework.web.socket.handler.WebSocketHandlerDecorator

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
  private val appProperties: AppProperties,
  private val stompAuthenticationChannelInterceptor: StompAuthenticationChannelInterceptor,
  private val webSocketSessionRegistry: WebSocketSessionRegistry,
) : WebSocketMessageBrokerConfigurer {
  override fun registerStompEndpoints(registry: StompEndpointRegistry) {
    registry.setPreserveReceiveOrder(true)
    registry
      .addEndpoint("/ws")
      .setAllowedOrigins(appProperties.frontendUrl)
  }

  override fun configureMessageBroker(registry: MessageBrokerRegistry) {
    registry.setApplicationDestinationPrefixes("/api")
    registry.enableSimpleBroker("/topic", "/queue")
    registry.setUserDestinationPrefix("/user")
  }

  override fun configureClientInboundChannel(registration: ChannelRegistration) {
    registration.interceptors(stompAuthenticationChannelInterceptor)
  }

  override fun configureWebSocketTransport(registration: WebSocketTransportRegistration) {
    registration.addDecoratorFactory { handler ->
      object : WebSocketHandlerDecorator(handler) {
        override fun afterConnectionEstablished(session: WebSocketSession) {
          super.afterConnectionEstablished(session)
          webSocketSessionRegistry.register(session)
        }

        override fun afterConnectionClosed(session: WebSocketSession, closeStatus: CloseStatus) {
          try {
            super.afterConnectionClosed(session, closeStatus)
          } finally {
            webSocketSessionRegistry.unregister(session)
          }
        }
      }
    }
  }
}

package com.example.server.config

import com.example.server.config.properties.AppProperties
import com.example.server.global.security.StompAuthenticationChannelInterceptor
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
  private val appProperties: AppProperties,
  private val stompAuthenticationChannelInterceptor: StompAuthenticationChannelInterceptor,
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
}

package com.example.server.config

import com.example.server.config.properties.AppProperties
import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(private val appProperties: AppProperties) : WebSocketMessageBrokerConfigurer {
  override fun registerStompEndpoints(registry: StompEndpointRegistry) {
    registry
      .addEndpoint("/ws")
      .setAllowedOrigins(appProperties.frontendUrl)
  }

  override fun configureMessageBroker(registry: MessageBrokerRegistry) {
    registry.setApplicationDestinationPrefixes("/api")
    registry.enableSimpleBroker("/topic", "/queue")
    registry.setUserDestinationPrefix("/user")
  }
}

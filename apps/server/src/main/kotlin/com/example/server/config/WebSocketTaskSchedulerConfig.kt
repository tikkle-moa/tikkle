package com.example.server.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler

@Configuration(proxyBeanMethods = false)
class WebSocketTaskSchedulerConfig {
  @Bean
  fun webSocketSessionTaskScheduler() = ThreadPoolTaskScheduler().apply {
    setPoolSize(1)
    setThreadNamePrefix("stomp-session-expiry-")
    setRemoveOnCancelPolicy(true)
  }
}

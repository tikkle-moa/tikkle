package com.example.server.config

import com.example.server.config.properties.OutboxCleanupProperties
import com.example.server.config.properties.OutboxDispatcherProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(
  OutboxDispatcherProperties::class,
  OutboxCleanupProperties::class,
)
class OutboxConfig

package com.example.server.outbox.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(OutboxDispatcherProperties::class)
class OutboxConfig

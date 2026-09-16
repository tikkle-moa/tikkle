package com.example.server.outbox.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "outbox.dispatcher")
data class OutboxDispatcherProperties(
  val enabled: Boolean = true,
  val batchSize: Int = 100,
  val leaseMillis: Long = 30_000,
  val maxAttempts: Int = 5,
  val retryDelayMillis: Long = 5_000,
)

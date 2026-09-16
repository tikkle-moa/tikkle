package com.example.server.outbox.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "outbox.cleanup")
data class OutboxCleanupProperties(
  val enabled: Boolean = true,
  val fixedDelay: Long = 86_400_000,
  val batchSize: Int = 1_000,
  val retentionMonths: Long = 2,
)

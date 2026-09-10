package com.example.server.config.properties

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "toss.payments")
data class TossPaymentsProperties(val baseUrl: String, val secretKey: String)

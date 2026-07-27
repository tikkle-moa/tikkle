package com.example.server.config.properties

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app")
data class AppProperties(val baseUrl: String)

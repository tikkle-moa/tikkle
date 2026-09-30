package com.example.server.config

import com.example.server.config.properties.TossPaymentsProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@EnableConfigurationProperties(TossPaymentsProperties::class)
class TossPaymentsConfig

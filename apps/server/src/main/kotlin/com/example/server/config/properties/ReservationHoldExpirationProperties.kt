package com.example.server.config.properties

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "reservation.hold-expiration")
data class ReservationHoldExpirationProperties(val listenerEnabled: Boolean = true, val redisNotifyKeyspaceEvents: String = "")

package com.example.server.config

import com.example.server.config.properties.ReservationHoldExpirationProperties
import com.example.server.performance.stomp.RedisSeatHoldExpirationListener
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.listener.PatternTopic
import org.springframework.data.redis.listener.RedisMessageListenerContainer

@Configuration
@EnableConfigurationProperties(ReservationHoldExpirationProperties::class)
@ConditionalOnProperty(
  prefix = "reservation.hold-expiration",
  name = ["listener-enabled"],
  havingValue = "true",
  matchIfMissing = true,
)
class ReservationHoldExpirationConfig(private val holdExpirationProperties: ReservationHoldExpirationProperties) {
  @Bean
  fun redisKeyspaceNotificationConfigurer(connectionFactory: RedisConnectionFactory): ApplicationRunner = ApplicationRunner {
    val keyspaceEvents =
      holdExpirationProperties.redisNotifyKeyspaceEvents

    if (keyspaceEvents.isBlank()) {
      return@ApplicationRunner
    }

    connectionFactory.connection.use { connection ->
      connection.serverCommands().setConfig(
        "notify-keyspace-events",
        keyspaceEvents,
      )
    }
  }

  @Bean
  fun redisMessageListenerContainer(
    connectionFactory: RedisConnectionFactory,
    redisSeatHoldExpirationListener: RedisSeatHoldExpirationListener,
  ): RedisMessageListenerContainer = RedisMessageListenerContainer().apply {
    setConnectionFactory(connectionFactory)
    addMessageListener(
      redisSeatHoldExpirationListener,
      PatternTopic("__keyevent@0__:expired"),
    )
  }
}

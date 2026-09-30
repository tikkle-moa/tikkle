package com.example.server.config

import com.example.server.auth.dto.OAuthStateData
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.data.redis.serializer.JacksonJsonRedisSerializer
import org.springframework.data.redis.serializer.StringRedisSerializer

@Configuration
class RedisConfig {
  @Bean
  fun oauthStateRedisTemplate(connectionFactory: RedisConnectionFactory): RedisTemplate<String, OAuthStateData> {
    val valueSerializer =
      JacksonJsonRedisSerializer(OAuthStateData::class.java)

    return RedisTemplate<String, OAuthStateData>().apply {
      this.connectionFactory = connectionFactory

      keySerializer = StringRedisSerializer()
      hashKeySerializer = StringRedisSerializer()

      this.valueSerializer = valueSerializer
      hashValueSerializer = valueSerializer

      afterPropertiesSet()
    }
  }
}

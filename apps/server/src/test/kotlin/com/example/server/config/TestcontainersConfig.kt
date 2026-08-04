package com.example.server.config

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.testcontainers.containers.GenericContainer
import org.testcontainers.mysql.MySQLContainer

@TestConfiguration(proxyBeanMethods = false)
class TestcontainersConfig {

  @Bean
  @ServiceConnection
  fun mysqlContainer(): MySQLContainer = MySQLContainer("mysql:8.4")
    .withDatabaseName("tikkle_test")
    .withUsername("test")
    .withPassword("test")

  @Bean
  @ServiceConnection(name = "redis")
  fun redisContainer(): GenericContainer<*> = GenericContainer("redis:7.4-alpine")
    .withExposedPorts(6379)
}

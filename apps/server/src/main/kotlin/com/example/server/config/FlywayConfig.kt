package com.example.server.config

import org.flywaydb.core.Flyway
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import javax.sql.DataSource

@Configuration
class FlywayConfig {
  @Bean(initMethod = "migrate")
  fun flyway(dataSource: DataSource): Flyway = Flyway.configure()
    .dataSource(dataSource)
    .locations("classpath:db/migration")
    .baselineOnMigrate(true)
    .load()
}

package com.example.server

import com.example.server.config.TestcontainersConfig
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
class ServerApplicationTests {

  @Test
  fun contextLoads() {
  }
}

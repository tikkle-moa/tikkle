package com.example.server.group

import com.example.server.config.TestcontainersConfig
import com.fasterxml.jackson.databind.ObjectMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import java.net.URI

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = ["springwolf.enabled=true"])
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
class GroupStompAsyncApiTest(@LocalServerPort private val port: Int, @Autowired private val objectMapper: ObjectMapper) {
  @Test
  fun `그룹 채팅 명령은 별도 응답 채널을 명세하지 않는다`() {
    val document = URI("http://localhost:$port/api/springwolf/docs").toURL().readText()
    val asyncApi = objectMapper.readTree(document)
    val operationId = asyncApi["operations"].fieldNames().asSequence()
      .first { it.contains("sendGroupChatMessage") }
    val operation = asyncApi["operations"][operationId]

    assertThat(operation.has("reply")).isFalse()
  }
}

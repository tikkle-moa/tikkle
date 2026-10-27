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
  fun `그룹 채팅 명령은 성공 응답 없이 오류 응답만 명세한다`() {
    val document = URI("http://localhost:$port/api/springwolf/docs").toURL().readText()
    val asyncApi = objectMapper.readTree(document)
    val operationId = asyncApi["operations"].fieldNames().asSequence()
      .first { it.contains("sendGroupChatMessage") }
    val operation = asyncApi["operations"][operationId]
    val channelId = operation["reply"]["channel"]["\$ref"].asText().substringAfterLast('/')
    val channel = asyncApi["channels"][channelId]

    assertThat(channel["messages"].fieldNames().asSequence().toList())
      .containsExactly("StompFailureMessage")
    assertThat(operation["reply"]["messages"].size()).isEqualTo(1)
    assertThat(operation["reply"]["messages"][0]["\$ref"].asText())
      .endsWith("/StompFailureMessage")
    assertThat(asyncApi["components"]["messages"].has("void")).isFalse()
  }
}

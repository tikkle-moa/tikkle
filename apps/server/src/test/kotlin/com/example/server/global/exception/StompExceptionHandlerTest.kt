package com.example.server.global.exception

import com.example.server.global.stomp.dto.StompCommandError
import com.example.server.global.stomp.dto.StompCommandFailure
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentMatchers.eq
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.beans.factory.ObjectProvider
import org.springframework.messaging.Message
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.support.GenericMessage
import tools.jackson.databind.ObjectMapper
import java.nio.charset.StandardCharsets
import java.security.Principal
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class StompExceptionHandlerTest {
  @Mock
  lateinit var messagingTemplateProvider: ObjectProvider<SimpMessagingTemplate>

  @Mock
  lateinit var messagingTemplate: SimpMessagingTemplate

  @Mock
  lateinit var objectMapper: ObjectMapper

  private lateinit var handler: StompExceptionHandler
  private lateinit var requestMessage: Message<String>

  private val principal = Principal { "1" }
  private val requestId = UUID.fromString("2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a")
  private val action = "START_CHECKOUT"
  private val requestPayload =
    """
  {
    "requestId": "$requestId",
    "action": "$action",
    "data": {}
  }
    """.trimIndent()
  private val requestMetadata = StompRequestMetadata(
    requestId = requestId,
    action = action,
  )

  @BeforeEach
  fun setUp() {
    handler = StompExceptionHandler(
      messagingTemplateProvider = messagingTemplateProvider,
      objectMapper = objectMapper,
    )

    requestMessage = GenericMessage(requestPayload)
  }

  @Nested
  inner class HandleCustomException {
    @Test
    fun `도메인별 개인 queue로 CustomException 실패 Envelope를 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)

      handler.handleCustomException(
        exception = CustomException(
          errorCode = ErrorCode.CONFLICT,
          message = "이미 처리된 요청입니다.",
        ),
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      val responseCaptor = ArgumentCaptor.forClass(
        StompCommandFailure::class.java,
      )

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performance"),
          responseCaptor.capture(),
        )

      assertThat(responseCaptor.value)
        .isEqualTo(
          StompCommandFailure(
            requestId = requestId,
            action = action,
            error = StompCommandError(
              code = ErrorCode.CONFLICT.name,
              message = "이미 처리된 요청입니다.",
            ),
          ),
        )
    }

    @Test
    fun `CustomException 요청 payload 파싱에 실패하면 메시지를 전송하지 않는다`() {
      given(
        objectMapper.readValue(
          anyString(),
          eq(StompRequestMetadata::class.java),
        ),
      ).willThrow(IllegalArgumentException("잘못된 payload"))

      handler.handleCustomException(
        exception = CustomException(ErrorCode.BAD_REQUEST),
        message = GenericMessage("""{"invalid": true}"""),
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      then(messagingTemplateProvider)
        .shouldHaveNoInteractions()
    }
  }

  @Nested
  inner class HandleException {
    @Test
    fun `처리되지 않은 예외는 내부 오류 실패 Envelope로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)

      handler.handleException(
        exception = IllegalStateException("내부 상세 오류"),
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      val responseCaptor = ArgumentCaptor.forClass(
        StompCommandFailure::class.java,
      )

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performance"),
          responseCaptor.capture(),
        )

      assertThat(responseCaptor.value.error.code)
        .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.name)

      assertThat(responseCaptor.value.error.message)
        .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.message)
    }
  }

  @Test
  fun `sync destination 형식이 아니면 메시지를 전송하지 않는다`() {
    givenValidRequestMetadata()

    handler.handleCustomException(
      exception = CustomException(ErrorCode.BAD_REQUEST),
      message = requestMessage,
      principal = principal,
      headerAccessor = headerAccessor("/api/invalid"),
    )

    then(messagingTemplateProvider)
      .shouldHaveNoInteractions()
  }

  @Test
  fun `ByteArray payload에서도 요청 공통 필드를 파싱한다`() {
    givenValidRequestMetadata()
    given(messagingTemplateProvider.getObject())
      .willReturn(messagingTemplate)

    handler.handleCustomException(
      exception = CustomException(ErrorCode.CONFLICT),
      message = GenericMessage(
        requestPayload.toByteArray(StandardCharsets.UTF_8),
      ),
      principal = principal,
      headerAccessor = headerAccessor("/api/performance/sync"),
    )

    val responseCaptor = ArgumentCaptor.forClass(
      StompCommandFailure::class.java,
    )

    then(messagingTemplate)
      .should()
      .convertAndSendToUser(
        eq("1"),
        eq("/queue/performance"),
        responseCaptor.capture(),
      )

    assertThat(responseCaptor.value.requestId)
      .isEqualTo(requestId)
    assertThat(responseCaptor.value.action)
      .isEqualTo(action)
  }

  @Test
  fun `객체 payload는 JSON 문자열로 변환한 뒤 요청 공통 필드를 파싱한다`() {
    val payload = mapOf(
      "requestId" to requestId.toString(),
      "action" to action,
      "data" to emptyMap<String, Any>(),
    )

    given(objectMapper.writeValueAsString(payload))
      .willReturn(requestPayload)
    given(
      objectMapper.readValue(
        requestPayload,
        StompRequestMetadata::class.java,
      ),
    ).willReturn(requestMetadata)
    given(messagingTemplateProvider.getObject())
      .willReturn(messagingTemplate)

    handler.handleCustomException(
      exception = CustomException(ErrorCode.CONFLICT),
      message = GenericMessage(payload),
      principal = principal,
      headerAccessor = headerAccessor("/api/performance/sync"),
    )

    then(messagingTemplate)
      .should()
      .convertAndSendToUser(
        eq("1"),
        eq("/queue/performance"),
        ArgumentCaptor.forClass(StompCommandFailure::class.java).capture(),
      )
  }

  @Test
  fun `요청 공통 필드를 파싱하지 못하면 메시지를 전송하지 않는다`() {
    given(
      objectMapper.readValue(
        anyString(),
        eq(StompRequestMetadata::class.java),
      ),
    ).willThrow(IllegalArgumentException("잘못된 payload"))

    handler.handleException(
      exception = IllegalStateException("내부 오류"),
      message = GenericMessage("""{"invalid": true}"""),
      principal = principal,
      headerAccessor = headerAccessor("/api/performance/sync"),
    )

    then(messagingTemplateProvider)
      .shouldHaveNoInteractions()
  }

  private fun givenValidRequestMetadata() {
    given(
      objectMapper.readValue(
        anyString(),
        eq(StompRequestMetadata::class.java),
      ),
    ).willReturn(requestMetadata)
  }

  private fun headerAccessor(destination: String): SimpMessageHeaderAccessor = SimpMessageHeaderAccessor.create().apply {
    this.destination = destination
  }
}

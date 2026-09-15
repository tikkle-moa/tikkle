package com.example.server.global.exception

import com.example.server.global.stomp.StompErrorMessage
import com.example.server.global.stomp.StompFailureMessage
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.anyString
import org.mockito.ArgumentMatchers.eq
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.beans.factory.ObjectProvider
import org.springframework.core.MethodParameter
import org.springframework.messaging.Message
import org.springframework.messaging.MessageHeaders
import org.springframework.messaging.converter.MessageConversionException
import org.springframework.messaging.handler.annotation.support.MethodArgumentNotValidException
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.messaging.support.GenericMessage
import org.springframework.messaging.support.MessageHeaderAccessor
import org.springframework.validation.BeanPropertyBindingResult
import tools.jackson.databind.ObjectMapper
import tools.jackson.databind.exc.InvalidTypeIdException
import tools.jackson.databind.exc.MismatchedInputException
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
    fun `요청 destination을 queue destination으로 변환해 CustomException 실패 Envelope를 전송한다`() {
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
        headerAccessor = headerAccessor("/api/performances/1/seat-holds"),
      )

      val responseCaptor = ArgumentCaptor.forClass(
        StompFailureMessage::class.java,
      )
      val headersCaptor = ArgumentCaptor.forClass(MessageHeaders::class.java)

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performances/1/seat-holds"),
          responseCaptor.capture(),
          headersCaptor.capture(),
        )

      assertThat(responseCaptor.value)
        .isEqualTo(
          StompFailureMessage(
            requestId = requestId,
            error = StompErrorMessage(
              code = ErrorCode.CONFLICT.name,
              message = "이미 처리된 요청입니다.",
            ),
          ),
        )
      assertThat(
        MessageHeaderAccessor.getAccessor(
          headersCaptor.value,
          SimpMessageHeaderAccessor::class.java,
        )?.isMutable,
      ).isTrue()
      assertThat(
        MessageHeaderAccessor.getAccessor(
          headersCaptor.value,
          SimpMessageHeaderAccessor::class.java,
        )?.sessionId,
      ).isEqualTo("session-1")
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
  inner class HandleMethodArgumentNotValidException {
    @Test
    fun `검증 실패 예외는 BAD_REQUEST 실패 Envelope로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)
      val bindingResult = BeanPropertyBindingResult(
        ValidationTarget(action = "GET_CURRENT_STATUS"),
        "command",
      ).apply {
        rejectValue("action", "Pattern", "지원하지 않는 공연 동기화 명령입니다.")
      }
      val exception = MethodArgumentNotValidException(
        requestMessage,
        MethodParameter(
          StompExceptionHandlerTest::class.java.getDeclaredMethod("validationTarget", ValidationTarget::class.java),
          0,
        ),
        bindingResult,
      )

      handler.handleMethodArgumentNotValidException(
        exception = exception,
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      val responseCaptor = ArgumentCaptor.forClass(
        StompFailureMessage::class.java,
      )

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performance/sync"),
          responseCaptor.capture(),
          any<Map<String, Any>>(),
        )

      assertThat(responseCaptor.value)
        .isEqualTo(
          StompFailureMessage(
            requestId = requestId,
            error = StompErrorMessage(
              code = ErrorCode.BAD_REQUEST.name,
              message = "action: 지원하지 않는 공연 동기화 명령입니다.",
            ),
          ),
        )
    }

    @Test
    fun `검증 실패 메시지가 없으면 기본 BAD_REQUEST 메시지로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)
      val exception = MethodArgumentNotValidException(
        requestMessage,
        validationMethodParameter(),
      )

      handler.handleMethodArgumentNotValidException(
        exception = exception,
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      val responseCaptor = ArgumentCaptor.forClass(
        StompFailureMessage::class.java,
      )

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performance/sync"),
          responseCaptor.capture(),
          any<Map<String, Any>>(),
        )

      assertThat(responseCaptor.value.error.code)
        .isEqualTo(ErrorCode.BAD_REQUEST.name)
      assertThat(responseCaptor.value.error.message)
        .isEqualTo(ErrorCode.BAD_REQUEST.message)
    }

    @Test
    fun `검증 실패 예외도 요청 payload 파싱에 실패하면 메시지를 전송하지 않는다`() {
      given(
        objectMapper.readValue(
          anyString(),
          eq(StompRequestMetadata::class.java),
        ),
      ).willThrow(IllegalArgumentException("잘못된 payload"))
      val exception = MethodArgumentNotValidException(
        requestMessage,
        validationMethodParameter(),
      )

      handler.handleMethodArgumentNotValidException(
        exception = exception,
        message = GenericMessage("""{"invalid": true}"""),
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      then(messagingTemplateProvider)
        .shouldHaveNoInteractions()
    }
  }

  @Nested
  inner class HandleMessageConversionException {
    @Test
    fun `지원하지 않는 action 변환 오류는 action 오류 메시지로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)
      val exception = MessageConversionException(
        "메시지 변환 실패",
        invalidTypeIdException("UNKNOWN_ACTION"),
      )

      handler.handleMessageConversionException(
        exception = exception,
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      assertFailureMessage("action 값 'UNKNOWN_ACTION'은 올바르지 않습니다.")
    }

    @Test
    fun `필드 변환 오류는 경로를 포함한 메시지로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)
      val exception = MessageConversionException(
        "메시지 변환 실패",
        mismatchedInputException().apply {
          prependPath("root", "venueSeatIds")
          prependPath("root", "data")
        },
      )

      handler.handleMessageConversionException(
        exception = exception,
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      assertFailureMessage("data.venueSeatIds 값이 없거나 형식이 올바르지 않습니다.")
    }

    @Test
    fun `배열 인덱스 변환 오류는 인덱스 경로를 포함한 메시지로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)
      val exception = MessageConversionException(
        "메시지 변환 실패",
        mismatchedInputException().apply {
          prependPath("root", 0)
          prependPath("root", "data")
        },
      )

      handler.handleMessageConversionException(
        exception = exception,
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      assertFailureMessage("data.[0] 값이 없거나 형식이 올바르지 않습니다.")
    }

    @Test
    fun `경로가 없는 변환 오류는 기본 BAD_REQUEST 메시지로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)
      val exception = MessageConversionException(
        "메시지 변환 실패",
        mismatchedInputException(),
      )

      handler.handleMessageConversionException(
        exception = exception,
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      assertFailureMessage(ErrorCode.BAD_REQUEST.message)
    }

    @Test
    fun `알 수 없는 변환 오류는 기본 BAD_REQUEST 메시지로 전송한다`() {
      givenValidRequestMetadata()
      given(messagingTemplateProvider.getObject())
        .willReturn(messagingTemplate)

      handler.handleMessageConversionException(
        exception = MessageConversionException("메시지 변환 실패", IllegalArgumentException("원인")),
        message = requestMessage,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      assertFailureMessage(ErrorCode.BAD_REQUEST.message)
    }

    @Test
    fun `변환 오류 요청 payload 파싱에 실패하면 메시지를 전송하지 않는다`() {
      given(
        objectMapper.readValue(
          anyString(),
          eq(StompRequestMetadata::class.java),
        ),
      ).willThrow(IllegalArgumentException("잘못된 payload"))

      handler.handleMessageConversionException(
        exception = MessageConversionException("메시지 변환 실패"),
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
        StompFailureMessage::class.java,
      )

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performance/sync"),
          responseCaptor.capture(),
          any<Map<String, Any>>(),
        )

      assertThat(responseCaptor.value.error.code)
        .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.name)

      assertThat(responseCaptor.value.error.message)
        .isEqualTo(ErrorCode.INTERNAL_SERVER_ERROR.message)
    }
  }

  @Test
  fun `destination이 없으면 실패 메시지를 전송하지 않는다`() {
    givenValidRequestMetadata()

    handler.handleCustomException(
      exception = CustomException(ErrorCode.BAD_REQUEST),
      message = requestMessage,
      principal = principal,
      headerAccessor = headerAccessor(destination = null),
    )

    then(messagingTemplateProvider)
      .shouldHaveNoInteractions()
  }

  @Test
  fun `sessionId가 없으면 실패 메시지를 전송하지 않는다`() {
    givenValidRequestMetadata()

    handler.handleCustomException(
      exception = CustomException(ErrorCode.BAD_REQUEST),
      message = requestMessage,
      principal = principal,
      headerAccessor = headerAccessor(sessionId = null),
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
      StompFailureMessage::class.java,
    )

    then(messagingTemplate)
      .should()
      .convertAndSendToUser(
        eq("1"),
        eq("/queue/performance/sync"),
        responseCaptor.capture(),
        any<Map<String, Any>>(),
      )

    assertThat(responseCaptor.value.requestId)
      .isEqualTo(requestId)
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
        eq("/queue/performance/sync"),
        ArgumentCaptor.forClass(StompFailureMessage::class.java).capture(),
        any<Map<String, Any>>(),
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

  private fun assertFailureMessage(expectedMessage: String) {
    val responseCaptor = ArgumentCaptor.forClass(
      StompFailureMessage::class.java,
    )

    then(messagingTemplate)
      .should()
      .convertAndSendToUser(
        eq("1"),
        eq("/queue/performance/sync"),
        responseCaptor.capture(),
        any<Map<String, Any>>(),
      )

    assertThat(responseCaptor.value)
      .extracting { it.error.message }
      .isEqualTo(expectedMessage)
  }

  private fun invalidTypeIdException(typeId: String): InvalidTypeIdException {
    val mapper = ObjectMapper()
    mapper.createParser("{}").use { parser ->
      return InvalidTypeIdException.from(
        parser,
        "잘못된 action",
        mapper.constructType(Any::class.java),
        typeId,
      )
    }
  }

  private fun mismatchedInputException(): MismatchedInputException {
    val mapper = ObjectMapper()
    mapper.createParser("{}").use { parser ->
      return MismatchedInputException.from(
        parser,
        Any::class.java,
        "잘못된 입력",
      )
    }
  }

  private fun headerAccessor(destination: String? = "/api/performance/sync", sessionId: String? = "session-1"): SimpMessageHeaderAccessor =
    SimpMessageHeaderAccessor.create().apply {
      this.destination = destination
      this.sessionId = sessionId
    }

  @Suppress("unused")
  private fun validationTarget(command: ValidationTarget) = Unit

  private fun validationMethodParameter() = MethodParameter(
    StompExceptionHandlerTest::class.java.getDeclaredMethod("validationTarget", ValidationTarget::class.java),
    0,
  )

  private data class ValidationTarget(val action: String)
}

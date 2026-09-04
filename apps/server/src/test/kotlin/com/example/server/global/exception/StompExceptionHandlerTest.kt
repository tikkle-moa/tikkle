package com.example.server.global.exception

import com.example.server.global.stomp.dto.StompCommandError
import com.example.server.global.stomp.dto.StompCommandFailure
import com.example.server.global.stomp.dto.StompCommandRequest
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.ArgumentMatchers.eq
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.beans.factory.ObjectProvider
import org.springframework.messaging.simp.SimpMessageHeaderAccessor
import org.springframework.messaging.simp.SimpMessagingTemplate
import java.security.Principal
import java.util.UUID

private data class TestStompCommandRequest(override val requestId: UUID, override val action: String, override val data: Unit = Unit) :
  StompCommandRequest<Unit>

@ExtendWith(MockitoExtension::class)
class StompExceptionHandlerTest {
  @Mock
  lateinit var messagingTemplateProvider: ObjectProvider<SimpMessagingTemplate>

  @Mock
  lateinit var messagingTemplate: SimpMessagingTemplate

  private lateinit var handler: StompExceptionHandler
  private lateinit var request: StompCommandRequest<Unit>
  private val principal = Principal { "1" }

  @BeforeEach
  fun setUp() {
    handler = StompExceptionHandler(messagingTemplateProvider)

    request = TestStompCommandRequest(
      requestId = UUID.fromString("2f14f6c5-5c2b-4d3e-a34c-a859d5d87c2a"),
      action = "START_CHECKOUT",
      data = Unit,
    )
  }

  @Nested
  inner class HandleCustomException {
    @Test
    fun `도메인별 개인 queue로 CustomException 실패 Envelope를 전송한다`() {
      given(messagingTemplateProvider.getObject()).willReturn(messagingTemplate)

      handler.handleCustomException(
        exception = CustomException(ErrorCode.CONFLICT, "이미 처리된 요청입니다."),
        request = request,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      val responseCaptor = ArgumentCaptor.forClass(StompCommandFailure::class.java)

      then(messagingTemplate)
        .should()
        .convertAndSendToUser(
          eq("1"),
          eq("/queue/performance"),
          responseCaptor.capture(),
        )
      assertThat(responseCaptor.value).isEqualTo(
        StompCommandFailure(
          requestId = request.requestId,
          action = request.action,
          error = StompCommandError(
            code = ErrorCode.CONFLICT.name,
            message = "이미 처리된 요청입니다.",
          ),
        ),
      )
    }
  }

  @Nested
  inner class HandleException {
    @Test
    fun `처리되지 않은 예외는 내부 오류 실패 Envelope로 전송한다`() {
      given(messagingTemplateProvider.getObject()).willReturn(messagingTemplate)

      handler.handleException(
        exception = IllegalStateException("내부 상세 오류"),
        request = request,
        principal = principal,
        headerAccessor = headerAccessor("/api/performance/sync"),
      )

      val responseCaptor = ArgumentCaptor.forClass(StompCommandFailure::class.java)

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
    handler.handleCustomException(
      exception = CustomException(ErrorCode.BAD_REQUEST),
      request = request,
      principal = principal,
      headerAccessor = headerAccessor("/api/invalid"),
    )

    then(messagingTemplateProvider).shouldHaveNoInteractions()
  }

  private fun headerAccessor(destination: String): SimpMessageHeaderAccessor = SimpMessageHeaderAccessor.create().apply {
    this.destination = destination
  }
}

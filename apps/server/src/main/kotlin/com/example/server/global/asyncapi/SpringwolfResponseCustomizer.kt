package com.example.server.global.asyncapi

import io.github.springwolf.asyncapi.v3.model.AsyncAPI
import io.github.springwolf.asyncapi.v3.model.channel.ChannelReference
import io.github.springwolf.asyncapi.v3.model.channel.message.MessageHeaders
import io.github.springwolf.asyncapi.v3.model.channel.message.MessageObject
import io.github.springwolf.asyncapi.v3.model.channel.message.MessagePayload
import io.github.springwolf.asyncapi.v3.model.channel.message.MessageReference
import io.github.springwolf.asyncapi.v3.model.operation.Operation
import io.github.springwolf.asyncapi.v3.model.operation.OperationReply
import io.github.springwolf.asyncapi.v3.model.schema.MultiFormatSchema
import io.github.springwolf.asyncapi.v3.model.schema.SchemaReference
import io.github.springwolf.core.asyncapi.AsyncApiCustomizer
import io.github.springwolf.core.asyncapi.components.ComponentsService
import io.github.springwolf.core.asyncapi.scanners.common.headers.AsyncHeadersBuilder
import io.github.springwolf.core.asyncapi.scanners.common.payload.internal.PayloadService
import io.github.springwolf.core.asyncapi.scanners.operations.OperationCustomizer
import io.github.springwolf.plugins.stomp.asyncapi.scanners.bindings.StompBindingSendToUserFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.messaging.simp.annotation.SendToUser
import org.springframework.stereotype.Component
import java.lang.reflect.Method
import java.lang.reflect.ParameterizedType

@Component
@Suppress("SpringJavaInjectionPointsAutowiringInspection")
@ConditionalOnBean(ComponentsService::class)
@Order(Ordered.LOWEST_PRECEDENCE)
class SpringwolfResponseCustomizer(
  private val componentsService: ComponentsService,
  private val payloadService: PayloadService,
  private val asyncHeadersBuilder: AsyncHeadersBuilder,
  private val stompBindingSendToUserFactory: StompBindingSendToUserFactory,
) : OperationCustomizer,
  AsyncApiCustomizer {
  private val responseMessagesByOperationId = mutableMapOf<String, ResponseMessage>()

  override fun customize(operation: Operation, method: Method) {
    val sendToUser = method.getAnnotation(SendToUser::class.java) ?: return
    val genericReturnType = method.genericReturnType as? ParameterizedType ?: return

    val payloadSchema = payloadService.buildSchema(genericReturnType)
    val headerSchema = asyncHeadersBuilder.buildHeaders(payloadSchema)
    val headerSchemaName = componentsService.registerSchema(headerSchema)
    val responseMessage = MessageObject.builder()
      .name(payloadSchema.name())
      .title(payloadSchema.title())
      .headers(MessageHeaders.of(SchemaReference.toSchema(headerSchemaName)))
      .payload(MessagePayload.of(MultiFormatSchema.builder().schema(payloadSchema.payload()).build()))
      .bindings(stompBindingSendToUserFactory.buildMessageBinding(sendToUser, headerSchema))
      .build()

    componentsService.registerMessage(responseMessage)

    val responseChannelId = stompBindingSendToUserFactory.getChannelId(sendToUser)
    responseMessagesByOperationId[operation.operationId] = ResponseMessage(
      channelId = responseChannelId,
      messageName = responseMessage.messageId,
    )

    operation.reply = OperationReply.builder()
      .channel(ChannelReference.fromChannel(responseChannelId))
      .messages(listOf(MessageReference.toComponentMessage(responseMessage)))
      .build()
  }

  override fun customize(asyncAPI: AsyncAPI) {
    val channels = asyncAPI.channels ?: return
    val operations = asyncAPI.operations ?: return

    responseMessagesByOperationId.forEach { (operationId, responseMessage) ->
      val operation = operations[operationId] ?: return@forEach
      val channel = channels[responseMessage.channelId] ?: return@forEach
      val messages = (channel.messages ?: emptyMap()).toMutableMap()

      messages.remove("StompSuccessMessage")
      messages[responseMessage.messageName] = MessageReference.toComponentMessage(responseMessage.messageName)
      channel.messages = messages
      operation.reply = OperationReply.builder()
        .channel(ChannelReference.fromChannel(responseMessage.channelId))
        .messages(
          listOf(
            MessageReference.toChannelMessage(
              responseMessage.channelId,
              responseMessage.messageName,
            ),
          ),
        )
        .build()
    }

    asyncAPI.components?.messages?.remove("StompSuccessMessage")
  }

  private data class ResponseMessage(val channelId: String, val messageName: String)
}

package com.example.server.reservation.dto

import com.example.server.global.stomp.dto.StompCommandRequest
import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import java.util.UUID

@JsonTypeInfo(
  use = JsonTypeInfo.Id.NAME,
  include = JsonTypeInfo.As.EXISTING_PROPERTY,
  property = "action",
  visible = true,
)
@JsonSubTypes(
  JsonSubTypes.Type(StartCheckoutCommand::class, name = "START_CHECKOUT"),
  JsonSubTypes.Type(ConfirmPaymentCommand::class, name = "CONFIRM_PAYMENT"),
  JsonSubTypes.Type(CancelPaymentCommand::class, name = "CANCEL_PAYMENT"),
)
sealed interface ReservationSyncCommand<T : Any> : StompCommandRequest<T>

data class StartCheckoutCommand(override val requestId: UUID, override val action: String = "START_CHECKOUT", override val data: StartCheckoutData) :
  ReservationSyncCommand<StartCheckoutData>

data class StartCheckoutData(val holdId: String)

data class ConfirmPaymentCommand(
  override val requestId: UUID,
  override val action: String = "CONFIRM_PAYMENT",
  override val data: ConfirmPaymentData,
) : ReservationSyncCommand<ConfirmPaymentData>

data class ConfirmPaymentData(val paymentKey: String, val orderId: String, val amount: Int)

data class CancelPaymentCommand(override val requestId: UUID, override val action: String = "CANCEL_PAYMENT", override val data: CancelPaymentData) :
  ReservationSyncCommand<CancelPaymentData>

data class CancelPaymentData(val reservationId: Long)

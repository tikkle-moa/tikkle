package com.example.server.performance.dto

import com.example.server.global.stomp.dto.StompCommandRequest
import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import jakarta.validation.Valid
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.Size
import java.util.UUID

@JsonTypeInfo(
  use = JsonTypeInfo.Id.NAME,
  include = JsonTypeInfo.As.EXISTING_PROPERTY,
  property = "action",
  visible = true,
)
@JsonSubTypes(
  JsonSubTypes.Type(PerformanceSeatHoldCommand.Hold::class, name = "HOLD_SEATS"),
  JsonSubTypes.Type(PerformanceSeatHoldCommand.Release::class, name = "RELEASE_SEATS"),
)
sealed interface PerformanceSeatHoldCommand<T> : StompCommandRequest<T> {
  data class Data(
    @field:Size(min = 1, message = "점유할 좌석 ID 목록은 최소 1개 이상이어야 합니다.")
    val venueSeatIds: List<
      @Positive(message = "좌석 ID는 양수여야 합니다.")
      Long,
      >,
  )

  data class Hold(
    override val requestId: UUID,
    override val action: String = "HOLD_SEATS",
    @field:Valid
    override val data: Data,
  ) : PerformanceSeatHoldCommand<Data>

  data class Release(
    override val requestId: UUID,
    override val action: String = "RELEASE_SEATS",
    @field:Valid
    override val data: Data,
  ) : PerformanceSeatHoldCommand<Data>
}

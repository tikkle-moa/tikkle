package com.example.server.performance.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import java.math.BigDecimal

data class ApplySeatChangesRequest(
  @field:Valid
  val seats: List<SeatChangeRequest> = emptyList(),

  val deletedSeatIds: List<
    @Positive(message = "좌석 ID는 양수여야 합니다.")
    Long,
    > = emptyList(),
)

data class SeatChangeRequest(
  @field:Positive(message = "좌석 ID는 양수여야 합니다.")
  val id: Long? = null,

  @field:NotBlank(message = "구역명은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 50, message = "구역명은 최대 50자까지 입력할 수 있습니다.")
  val sectionName: String,

  @field:Positive(message = "좌석 번호는 양수여야 합니다.")
  val seatNumber: Int,

  @field:NotBlank(message = "좌석 표시는 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 50, message = "좌석 표시는 최대 50자까지 입력할 수 있습니다.")
  val seatLabel: String,

  @field:PositiveOrZero(message = "가격은 0 이상이어야 합니다.")
  val price: Int,

  @field:DecimalMin(value = "-999999.99", message = "X 좌표가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "X 좌표가 허용 범위를 벗어났습니다.")
  val positionX: BigDecimal,

  @field:DecimalMin(value = "-999999.99", message = "Y 좌표가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "Y 좌표가 허용 범위를 벗어났습니다.")
  val positionY: BigDecimal,
)

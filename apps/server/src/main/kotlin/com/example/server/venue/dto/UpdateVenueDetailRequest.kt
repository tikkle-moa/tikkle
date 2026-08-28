package com.example.server.venue.dto

import com.example.server.venue.entity.Venue
import jakarta.validation.Valid
import jakarta.validation.constraints.DecimalMax
import jakarta.validation.constraints.DecimalMin
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import org.openapitools.jackson.nullable.JsonNullable
import java.math.BigDecimal

data class UpdateVenueDetailRequest(
  @field:Valid
  val venue: UpdateVenueRequest? = null,

  @field:Valid
  val venueSeats: List<UpdateVenueSeatRequest>? = null,

  @field:Valid
  val deletedSeatIds: List<
    @Positive(message = "좌석 ID는 양수여야 합니다.")
    Long,
    >? = null,
)

data class UpdateVenueRequest(
  @field:NotBlank(message = "장소명은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 100, message = "장소명은 최대 100자까지 입력할 수 있습니다.")
  val name: JsonNullable<String> = JsonNullable.undefined(),

  @field:NotBlank(message = "주소는 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 200, message = "주소는 최대 200자까지 입력할 수 있습니다.")
  val address: JsonNullable<String> = JsonNullable.undefined(),

  @field:Size(max = 10_000, message = "설명은 최대 10,000자까지 입력할 수 있습니다.")
  val description: JsonNullable<String?> = JsonNullable.undefined(),

  @field:DecimalMin(value = "0", message = "장소 폭이 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "장소 폭이 허용 범위를 벗어났습니다.")
  val width: JsonNullable<BigDecimal> = JsonNullable.undefined(),

  @field:DecimalMin(value = "0", message = "장소 높이가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "장소 높이가 허용 범위를 벗어났습니다.")
  val height: JsonNullable<BigDecimal> = JsonNullable.undefined(),

  @field:DecimalMin(value = "0", message = "무대 X 좌표가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "무대 X 좌표가 허용 범위를 벗어났습니다.")
  val stagePositionX: JsonNullable<BigDecimal> = JsonNullable.undefined(),

  @field:DecimalMin(value = "0", message = "무대 Y 좌표가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "무대 Y 좌표가 허용 범위를 벗어났습니다.")
  val stagePositionY: JsonNullable<BigDecimal> = JsonNullable.undefined(),

  @field:DecimalMin(value = "0", message = "무대 가로가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999.99", message = "무대 가로가 허용 범위를 벗어났습니다.")
  val stageWidth: JsonNullable<BigDecimal> = JsonNullable.undefined(),

  @field:DecimalMin(value = "0", message = "무대 세로가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999.99", message = "무대 세로가 허용 범위를 벗어났습니다.")
  val stageHeight: JsonNullable<BigDecimal> = JsonNullable.undefined(),
) {
  fun applyTo(venue: Venue) {
    name.ifPresent { venue.name = it }
    address.ifPresent { venue.address = it }
    description.ifPresent { venue.description = it }
    width.ifPresent { venue.width = it }
    height.ifPresent { venue.height = it }
    stagePositionX.ifPresent { venue.stagePositionX = it }
    stagePositionY.ifPresent { venue.stagePositionY = it }
    stageWidth.ifPresent { venue.stageWidth = it }
    stageHeight.ifPresent { venue.stageHeight = it }
  }
}

data class UpdateVenueSeatRequest(
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

  @field:DecimalMin(value = "0", message = "X 좌표가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "X 좌표가 허용 범위를 벗어났습니다.")
  val positionX: BigDecimal,

  @field:DecimalMin(value = "0", message = "Y 좌표가 허용 범위를 벗어났습니다.")
  @field:DecimalMax(value = "999999.99", message = "Y 좌표가 허용 범위를 벗어났습니다.")
  val positionY: BigDecimal,
)

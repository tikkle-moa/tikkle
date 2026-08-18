package com.example.server.concert.dto

import com.example.server.concert.types.ConcertGenre
import com.example.server.global.validation.NullableNotBlank
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import org.openapitools.jackson.nullable.JsonNullable

class UpdateConcertRequest(
  @field:NotBlank(message = "콘서트 제목은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 100, message = "콘서트 제목은 최대 100자까지 입력할 수 있습니다.")
  var title: JsonNullable<String> = JsonNullable.undefined(),

  var genre: JsonNullable<ConcertGenre> = JsonNullable.undefined(),

  @field:NotBlank(message = "공연 장소는 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 100, message = "공연 장소는 최대 100자까지 입력할 수 있습니다.")
  var placeName: JsonNullable<String> = JsonNullable.undefined(),

  @field:NullableNotBlank(message = "공연 포스터 URL은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 400, message = "포스터 URL은 최대 400자까지 입력할 수 있습니다.")
  var posterUrl: JsonNullable<String?> = JsonNullable.undefined(),

  @field:NullableNotBlank(message = "콘서트 설명은 빈 문자열이 될 수 없습니다.")
  @field:Size(max = 10_000, message = "콘서트 설명은 최대 10,000자까지 입력할 수 있습니다.")
  var description: JsonNullable<String?> = JsonNullable.undefined(),
)

package com.example.server.concert.dto

import com.example.server.concert.types.ConcertGenre
import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonSetter
import io.swagger.v3.oas.annotations.media.Schema
import jakarta.validation.constraints.Size

class UpdateConcertRequest(
  @field:Size(min = 1, max = 100, message = "콘서트 제목은 1자 이상 100자 이하로 입력해야 합니다.")
  val title: String? = null,

  val genre: ConcertGenre? = null,

  @field:Size(min = 1, max = 100, message = "공연 장소는 1자 이상 100자 이하로 입력해야 합니다.")
  val placeName: String? = null,
) {
  @field:Size(min = 1, max = 400, message = "포스터 URL은 1자 이상 400자 이하로 입력해야 합니다.")
  var posterUrl: String? = null
    private set

  @field:Size(max = 10_000, message = "콘서트 설명은 최대 10,000자까지 입력할 수 있습니다.")
  var description: String? = null
    private set

  @get:JsonIgnore
  @get:Schema(hidden = true)
  var hasPosterUrl: Boolean = false
    private set

  @get:JsonIgnore
  @get:Schema(hidden = true)
  var hasDescription: Boolean = false
    private set

  @JsonSetter("posterUrl")
  fun updatePosterUrl(value: String?) {
    posterUrl = value
    hasPosterUrl = true
  }

  @JsonSetter("description")
  fun updateDescription(value: String?) {
    description = value
    hasDescription = true
  }
}

package com.example.server.concert.dto

import com.example.server.concert.types.ConcertGenre
import jakarta.validation.constraints.NotBlank

data class CreateConcertRequest(
  @field:NotBlank(message = "콘서트 제목은 필수입니다.")
  val title: String,

  val genre: ConcertGenre,

  @field:NotBlank(message = "공연 장소는 필수입니다.")
  val placeName: String,

  val posterUrl: String? = null,

  val description: String? = null,
)

package com.example.server.concert.dto

import com.example.server.concert.types.ConcertGenre
import com.fasterxml.jackson.annotation.JsonIgnore
import com.fasterxml.jackson.annotation.JsonSetter
import io.swagger.v3.oas.annotations.media.Schema

class UpdateConcertRequest(val title: String? = null, val genre: ConcertGenre? = null, val placeName: String? = null) {
  var posterUrl: String? = null
    private set

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

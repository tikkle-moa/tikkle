package com.example.server.concert.dto

import com.example.server.concert.types.ConcertGenre
import com.fasterxml.jackson.annotation.JsonSetter

class UpdateConcertRequest(val title: String? = null, val genre: ConcertGenre? = null, val placeName: String? = null) {
  var posterUrl: String? = null
    private set

  var description: String? = null
    private set

  var hasPosterUrl: Boolean = false
    private set

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

package com.example.server.concert

import com.example.server.concert.dto.ConcertResponse
import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ConcertService(private val concertRepository: ConcertRepository) {
  @Transactional
  fun create(request: CreateConcertRequest): ConcertResponse {
    val concert = Concert(
      title = request.title,
      genre = request.genre,
      placeName = request.placeName,
      posterUrl = request.posterUrl,
      description = request.description,
    )
    val savedConcert = concertRepository.save(concert)
    return ConcertResponse.from(savedConcert)
  }
}

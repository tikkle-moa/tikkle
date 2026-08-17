package com.example.server.concert

import com.example.server.concert.dto.ConcertResponse
import com.example.server.concert.dto.CreateConcertRequest
import com.example.server.concert.dto.UpdateConcertRequest
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ConcertService(private val concertRepository: ConcertRepository) {
  @Transactional
  fun create(createConcertRequest: CreateConcertRequest): ConcertResponse {
    val concert = Concert(
      title = createConcertRequest.title,
      genre = createConcertRequest.genre,
      placeName = createConcertRequest.placeName,
      posterUrl = createConcertRequest.posterUrl,
      description = createConcertRequest.description,
    )
    val savedConcert = concertRepository.save(concert)
    return ConcertResponse.from(savedConcert)
  }

  @Transactional
  fun update(id: Long, updateConcertRequest: UpdateConcertRequest): ConcertResponse {
    val concert = concertRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND) }

    updateConcertRequest.title?.let { concert.title = it }
    updateConcertRequest.genre?.let { concert.genre = it }
    updateConcertRequest.placeName?.let { concert.placeName = it }

    if (updateConcertRequest.hasPosterUrl) {
      concert.posterUrl = updateConcertRequest.posterUrl
    }

    if (updateConcertRequest.hasDescription) {
      concert.description = updateConcertRequest.description
    }

    return ConcertResponse.from(concert)
  }

  @Transactional
  fun delete(id: Long) {
    val concert = concertRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND) }

    concertRepository.delete(concert)
  }
}

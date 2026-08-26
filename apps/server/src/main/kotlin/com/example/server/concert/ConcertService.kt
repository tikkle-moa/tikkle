package com.example.server.concert

import com.example.server.concert.dto.ConcertDetailResponse
import com.example.server.concert.dto.ConcertListResponse
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

    updateConcertRequest.title.ifPresent { concert.title = it }
    updateConcertRequest.genre.ifPresent { concert.genre = it }
    updateConcertRequest.placeName.ifPresent { concert.placeName = it }
    updateConcertRequest.posterUrl.ifPresent { concert.posterUrl = it }
    updateConcertRequest.description.ifPresent { concert.description = it }

    return ConcertResponse.from(concert)
  }

  @Transactional
  fun delete(id: Long) {
    val concert = concertRepository.findById(id)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND) }

    concertRepository.delete(concert)
  }

  @Transactional(readOnly = true)
  fun getConcerts(): List<ConcertListResponse> {
    val concertList = concertRepository.findAllByOrderByCreatedAtDesc()

    return concertList.map(ConcertListResponse::from)
  }

  @Transactional(readOnly = true)
  fun getConcertDetail(concertId: Long): ConcertDetailResponse {
    val concert = concertRepository.findById(concertId)
      .orElseThrow { CustomException(ErrorCode.NOT_FOUND) }

    return ConcertDetailResponse(
      concert = ConcertResponse.from(concert),
      performances = emptyList(),
    )
  }
}

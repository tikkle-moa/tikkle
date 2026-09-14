package com.example.server.performance

import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.config.TestcontainersConfig
import com.example.server.global.exception.CustomException
import com.example.server.global.exception.ErrorCode
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
class RedisVenueSeatHoldServiceIntegrationTest {
  @Autowired lateinit var service: RedisVenueSeatHoldService

  @Autowired lateinit var performanceRepository: PerformanceRepository

  @Autowired lateinit var concertRepository: ConcertRepository

  @Autowired lateinit var venueRepository: VenueRepository

  @Autowired lateinit var venueSeatRepository: VenueSeatRepository

  @Test
  fun `여러 좌석을 원자적으로 점유하고 부분 해제한다`() {
    val fixture = fixture()
    val held = service.holdVenueSeats(USER_ID, fixture.performanceId, fixture.seatIds)

    assertThat(held.venueSeatIds).containsExactlyElementsOf(fixture.seatIds)
    assertThat(service.findHeldSeatsByPerformanceId(fixture.performanceId).map { it.id })
      .containsExactlyElementsOf(fixture.seatIds)

    val conflict = assertThrows<CustomException> {
      service.holdVenueSeats(USER_ID + 1, fixture.performanceId, listOf(fixture.seatIds.first()))
    }
    assertThat(conflict.errorCode).isEqualTo(ErrorCode.CONFLICT)

    val released = service.releaseVenueSeats(USER_ID, fixture.performanceId, listOf(fixture.seatIds.first()))

    assertThat(released).containsExactly(fixture.seatIds.first())
    assertThat(service.findActiveHoldDataByGroupId(service.getGroupId(USER_ID, fixture.performanceId)).holdVenueSeatEntries.map { it.venueSeatId })
      .containsExactly(fixture.seatIds[1])
    service.releaseAllVenueSeats(service.getGroupId(USER_ID, fixture.performanceId))
    assertThat(service.findHeldSeatsByPerformanceId(fixture.performanceId)).isEmpty()
  }

  @Test
  fun `다른 사용자는 Hold 좌석을 부분 해제할 수 없다`() {
    val fixture = fixture()
    service.holdVenueSeats(USER_ID, fixture.performanceId, fixture.seatIds)

    val exception = assertThrows<CustomException> {
      service.releaseVenueSeats(USER_ID + 1, fixture.performanceId, fixture.seatIds)
    }

    assertThat(exception.errorCode).isEqualTo(ErrorCode.FORBIDDEN)
    assertThat(service.findHeldSeatsByPerformanceId(fixture.performanceId).map { it.id })
      .containsExactlyElementsOf(fixture.seatIds)
    service.releaseAllVenueSeats(service.getGroupId(USER_ID, fixture.performanceId))
  }

  @Test
  fun `결제 전환은 모든 Hold detail의 만료 시각을 갱신하고 최종 확정은 그룹을 제거한다`() {
    val fixture = fixture()
    service.holdVenueSeats(USER_ID, fixture.performanceId, fixture.seatIds)
    val groupId = service.getGroupId(USER_ID, fixture.performanceId)
    val paymentExpiresAt = LocalDateTime.now().plusMinutes(10)

    service.transitionForPayment(groupId, paymentExpiresAt)

    val transitioned = service.findActiveHoldDataByGroupId(groupId)
    assertThat(transitioned.holdDetails.single().expiresAt).isEqualTo(paymentExpiresAt)

    val finalizedSeatIds = service.finalizeForPayment(groupId)

    assertThat(finalizedSeatIds).containsExactlyElementsOf(fixture.seatIds)
    assertThat(service.findHeldSeatsByPerformanceId(fixture.performanceId)).isEmpty()
  }

  private fun fixture(): Fixture {
    val venue = venueRepository.save(
      Venue(
        name = "Redis Hold 테스트 공연장 ${UUID.randomUUID()}",
        address = "서울",
        width = BigDecimal("100"),
        height = BigDecimal("100"),
        stagePositionX = BigDecimal("20"),
        stagePositionY = BigDecimal("5"),
        stageWidth = BigDecimal("40"),
        stageHeight = BigDecimal("10"),
      ),
    )
    val concert = concertRepository.save(
      Concert(
        venue = venue,
        title = "Redis Hold 테스트 공연 ${UUID.randomUUID()}",
        genre = ConcertGenre.BALLAD,
      ),
    )
    val performance = performanceRepository.save(
      com.example.server.performance.entity.Performance(
        concert = concert,
        name = "1회차",
        startsAt = LocalDateTime.now().plusDays(1),
      ),
    )
    val seats = venueSeatRepository.saveAll(
      listOf(
        seat(venue, 1),
        seat(venue, 2),
      ),
    )
    return Fixture(performance.id, seats.map { it.id })
  }

  private fun seat(venue: Venue, number: Int) = VenueSeat(
    venue = venue,
    sectionName = "A-${UUID.randomUUID()}",
    seatNumber = number,
    seatLabel = "A-$number",
    price = 66_000,
    positionX = BigDecimal(number),
    positionY = BigDecimal(number),
  )

  private data class Fixture(val performanceId: Long, val seatIds: List<Long>)

  companion object {
    private const val USER_ID = 919191L
  }
}

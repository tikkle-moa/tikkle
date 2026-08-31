package com.example.server.performance

import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.config.TestcontainersConfig
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.venue.entity.Venue
import com.example.server.venue.repository.VenueRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
@Transactional
class PerformanceRepositoryTest {
  @Autowired
  lateinit var concertRepository: ConcertRepository

  @Autowired
  lateinit var performanceRepository: PerformanceRepository

  @Autowired
  lateinit var venueRepository: VenueRepository

  @BeforeEach
  fun setUp() {
    performanceRepository.deleteAll()
    concertRepository.deleteAll()
    venueRepository.deleteAll()
  }

  @Test
  fun `전체 회차는 예정 회차를 우선하고 각 그룹을 시작 시각 오름차순으로 조회한다`() {
    val concert = concertRepository.save(concert("테스트 콘서트"))
    val now = LocalDateTime.now()
    val oldPast = performanceRepository.save(performance(concert, now.minusDays(2)))
    val recentPast = performanceRepository.save(performance(concert, now.minusDays(1)))
    val nearestUpcoming = performanceRepository.save(performance(concert, now.plusDays(1)))
    val laterUpcoming = performanceRepository.save(performance(concert, now.plusDays(2)))
    performanceRepository.flush()

    val result = performanceRepository.findAllUpcomingFirstOrderByStartsAtAsc()

    assertThat(result.map { it.id }).containsExactly(
      nearestUpcoming.id,
      laterUpcoming.id,
      oldPast.id,
      recentPast.id,
    )
  }

  @Test
  fun `콘서트별 회차는 다른 콘서트를 제외하고 예정 회차 우선 오름차순으로 조회한다`() {
    val targetConcert = concertRepository.save(concert("조회 대상 콘서트"))
    val otherConcert = concertRepository.save(concert("다른 콘서트"))
    val now = LocalDateTime.now()
    val oldPast = performanceRepository.save(performance(targetConcert, now.minusDays(2)))
    val recentPast = performanceRepository.save(performance(targetConcert, now.minusDays(1)))
    val nearestUpcoming = performanceRepository.save(performance(targetConcert, now.plusDays(1)))
    val laterUpcoming = performanceRepository.save(performance(targetConcert, now.plusDays(2)))
    performanceRepository.save(performance(otherConcert, now.plusHours(1)))
    performanceRepository.flush()

    val result = performanceRepository.findAllByConcertUpcomingFirstOrderByStartsAtAsc(targetConcert)

    assertThat(result.map { it.id }).containsExactly(
      nearestUpcoming.id,
      laterUpcoming.id,
      oldPast.id,
      recentPast.id,
    )
  }

  private fun concert(title: String): Concert = Concert(
    venue = venueRepository.save(venue()),
    title = title,
    genre = ConcertGenre.BALLAD,
  )

  private fun venue(): Venue = Venue(
    name = "테스트 공연장",
    address = "서울",
    width = BigDecimal("100.00"),
    height = BigDecimal("100.00"),
    stagePositionX = BigDecimal("50.00"),
    stagePositionY = BigDecimal("10.00"),
    stageWidth = BigDecimal("40.00"),
    stageHeight = BigDecimal("10.00"),
  )

  private fun performance(concert: Concert, startsAt: LocalDateTime): Performance = Performance(
    concert = concert,
    name = "1회차",
    startsAt = startsAt,
  )
}

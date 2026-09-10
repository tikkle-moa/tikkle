package com.example.server.reservation

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.config.TestcontainersConfig
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.entity.Reservation
import com.example.server.reservation.entity.ReservationSeat
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
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
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import java.math.BigDecimal
import java.time.LocalDateTime
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
class ReservationRepositoryTest {
  @Autowired
  lateinit var reservationRepository: ReservationRepository

  @Autowired
  lateinit var reservationSeatRepository: ReservationSeatRepository

  @Autowired
  lateinit var userRepository: UserRepository

  @Autowired
  lateinit var performanceRepository: PerformanceRepository

  @Autowired
  lateinit var concertRepository: ConcertRepository

  @Autowired
  lateinit var venueRepository: VenueRepository

  @Autowired
  lateinit var venueSeatRepository: VenueSeatRepository

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  @Test
  fun `동일 Hold upsert는 두 번째 요청을 대기시키고 기존 예매를 반환한다`() {
    val fixture = createFixture()
    val performanceId = fixture.performanceId
    val userId = fixture.userId
    val holdId = "hold-checkout-${UUID.randomUUID()}"
    val firstOrderId = "tikkle-first-${UUID.randomUUID()}"
    val secondOrderId = "tikkle-second-${UUID.randomUUID()}"
    val transactionTemplate = TransactionTemplate(transactionManager)
    val executor = Executors.newFixedThreadPool(2)

    val firstInserted = CountDownLatch(1)
    val allowFirstCommit = CountDownLatch(1)
    val secondInsertStarted = CountDownLatch(1)

    try {
      val firstRequest = executor.submit {
        transactionTemplate.executeWithoutResult {
          insertPaymentPending(
            performanceId = performanceId,
            userId = userId,
            holdId = holdId,
            orderId = firstOrderId,
          )

          firstInserted.countDown()
          assertThat(allowFirstCommit.await(5, TimeUnit.SECONDS)).isTrue()
        }
      }

      assertThat(firstInserted.await(5, TimeUnit.SECONDS)).isTrue()

      val secondRequest = executor.submit<Reservation?> {
        transactionTemplate.execute {
          secondInsertStarted.countDown()

          insertPaymentPending(
            performanceId = performanceId,
            userId = userId,
            holdId = holdId,
            orderId = secondOrderId,
          )

          reservationRepository.findByHoldIdForUpdate(holdId)
        }
      }

      assertThat(secondInsertStarted.await(5, TimeUnit.SECONDS)).isTrue()

      assertThrows<TimeoutException> {
        secondRequest.get(300, TimeUnit.MILLISECONDS)
      }

      allowFirstCommit.countDown()

      firstRequest.get(5, TimeUnit.SECONDS)
      val existingReservation = secondRequest.get(5, TimeUnit.SECONDS)

      assertThat(existingReservation).isNotNull
      assertThat(existingReservation!!.holdId).isEqualTo(holdId)
      assertThat(existingReservation.orderId).isEqualTo(firstOrderId)
    } finally {
      allowFirstCommit.countDown()
      executor.shutdownNow()
    }
  }

  @Test
  fun `공연과 예약 상태로 예매 좌석 ID를 조회한다`() {
    val fixture = createFixture()
    val performanceId = fixture.performanceId
    val userId = fixture.userId
    val performance = performanceRepository.findById(performanceId).orElseThrow()
    val user = userRepository.findById(userId).orElseThrow()
    val venue = venueRepository.findById(fixture.venueId).orElseThrow()
    val seats = venueSeatRepository.saveAll(
      listOf(
        venueSeat(venue, seatNumber = 1),
        venueSeat(venue, seatNumber = 2),
        venueSeat(venue, seatNumber = 3),
      ),
    )
    val succeededReservation = reservationRepository.save(
      reservation(
        performance = performance,
        user = user,
        status = ReservationStatus.SUCCEEDED,
      ),
    )
    val pendingReservation = reservationRepository.save(
      reservation(
        performance = performance,
        user = user,
        status = ReservationStatus.PAYMENT_PENDING,
      ),
    )
    reservationSeatRepository.saveAll(
      listOf(
        ReservationSeat(reservation = succeededReservation, performance = performance, venueSeat = seats[1]),
        ReservationSeat(reservation = succeededReservation, performance = performance, venueSeat = seats[0]),
        ReservationSeat(reservation = pendingReservation, performance = performance, venueSeat = seats[2]),
      ),
    )

    val result = reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatus(
      performanceId = performance.id,
      status = ReservationStatus.SUCCEEDED,
    )

    assertThat(result).containsExactly(seats[0].id, seats[1].id)
  }

  private fun insertPaymentPending(performanceId: Long, userId: Long, holdId: String, orderId: String) {
    reservationRepository.insertPaymentPendingIfAbsent(
      performanceId = performanceId,
      bookerUserId = userId,
      holdId = holdId,
      orderId = orderId,
      orderName = "동시성 테스트 공연 1회차 1석",
      amount = 66_000,
      paymentExpiresAt = LocalDateTime.now().plusMinutes(5),
    )
  }

  private fun createFixture(): ReservationFixture {
    val venue = venueRepository.save(
      Venue(
        name = "동시성 테스트 공연장",
        address = "서울",
        width = BigDecimal("100.00"),
        height = BigDecimal("100.00"),
        stagePositionX = BigDecimal("20.00"),
        stagePositionY = BigDecimal("5.00"),
        stageWidth = BigDecimal("40.00"),
        stageHeight = BigDecimal("10.00"),
      ),
    )
    val concert = concertRepository.save(
      Concert(
        venue = venue,
        title = "동시성 테스트 공연",
        genre = ConcertGenre.BALLAD,
      ),
    )
    val performance = performanceRepository.save(
      Performance(
        concert = concert,
        name = "1회차",
        startsAt = LocalDateTime.now().plusDays(1),
      ),
    )
    val user = userRepository.save(
      User(
        email = "checkout-lock-${UUID.randomUUID()}@example.com",
        nickname = "동시성 사용자",
      ),
    )

    return ReservationFixture(
      performanceId = performance.id,
      userId = user.id,
      venueId = venue.id,
    )
  }

  private data class ReservationFixture(val performanceId: Long, val userId: Long, val venueId: Long)

  private fun reservation(performance: Performance, user: User, status: ReservationStatus): Reservation = Reservation(
    performance = performance,
    booker = user,
    holdId = "hold-${UUID.randomUUID()}",
    orderId = "tikkle-${UUID.randomUUID()}",
    orderName = "좌석 조회 테스트 공연 1회차 1석",
    amount = 66_000,
    status = status,
    paymentExpiresAt = LocalDateTime.now().plusMinutes(5),
  )

  private fun venueSeat(venue: Venue, seatNumber: Int): VenueSeat = VenueSeat(
    venue = venue,
    sectionName = "A-${UUID.randomUUID()}",
    seatNumber = seatNumber,
    seatLabel = "A-$seatNumber",
    price = 66_000,
    positionX = BigDecimal(seatNumber),
    positionY = BigDecimal(seatNumber),
  )
}

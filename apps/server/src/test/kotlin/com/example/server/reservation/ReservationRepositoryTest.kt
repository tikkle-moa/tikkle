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
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.venue.entity.Venue
import com.example.server.venue.repository.VenueRepository
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
  lateinit var userRepository: UserRepository

  @Autowired
  lateinit var performanceRepository: PerformanceRepository

  @Autowired
  lateinit var concertRepository: ConcertRepository

  @Autowired
  lateinit var venueRepository: VenueRepository

  @Autowired
  lateinit var transactionManager: PlatformTransactionManager

  @Test
  fun `동일 Hold upsert는 두 번째 요청을 대기시키고 기존 예약을 반환한다`() {
    val (performanceId, userId) = createFixture()
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

  private fun createFixture(): Pair<Long, Long> {
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

    return performance.id to user.id
  }
}

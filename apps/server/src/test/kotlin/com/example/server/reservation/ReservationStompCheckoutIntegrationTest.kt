package com.example.server.reservation

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.auth.types.UserRole
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.config.TestcontainersConfig
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.reservation.payment.PaymentGateway
import com.example.server.reservation.payment.dto.ExternalPayment
import com.example.server.reservation.payment.types.ExternalPaymentStatus
import com.example.server.reservation.repository.ReservationRepository
import com.example.server.reservation.repository.ReservationSeatRepository
import com.example.server.reservation.types.ReservationStatus
import com.example.server.venue.entity.Venue
import com.example.server.venue.entity.VenueSeat
import com.example.server.venue.repository.VenueRepository
import com.example.server.venue.repository.VenueSeatRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyInt
import org.mockito.ArgumentMatchers.anyString
import org.mockito.BDDMockito.given
import org.mockito.Mockito.never
import org.mockito.Mockito.times
import org.mockito.Mockito.verify
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Import
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.messaging.converter.JacksonJsonMessageConverter
import org.springframework.messaging.simp.stomp.StompFrameHandler
import org.springframework.messaging.simp.stomp.StompHeaders
import org.springframework.messaging.simp.stomp.StompSession
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter
import org.springframework.scheduling.TaskScheduler
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.web.socket.WebSocketHttpHeaders
import org.springframework.web.socket.client.standard.StandardWebSocketClient
import org.springframework.web.socket.messaging.WebSocketStompClient
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.lang.reflect.Type
import java.math.BigDecimal
import java.net.URI
import java.time.Duration
import java.time.LocalDateTime
import java.util.UUID
import java.util.concurrent.BlockingQueue
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.LinkedBlockingQueue
import java.util.concurrent.TimeUnit

private const val ACCESS_SESSION_KEY_PREFIX = "auth:refresh:"
private const val SEAT_HOLD_KEY_PREFIX = "hold:venue-seat:"
private const val HOLD_DETAIL_KEY_PREFIX = "hold:detail:"
private const val HOLD_EXPIRY_KEY_PREFIX = "hold:expiry:"
private const val HOLD_GROUP_KEY_PREFIX = "hold:group:"
private const val HOLD_GROUP_CONTROL_KEY_PREFIX = "hold:group-control:"
private const val HOLD_GROUP_REVIEW_RESULT_KEY_PREFIX = "hold:group-review-result:"
private const val HOLD_PERFORMANCE_KEY_PREFIX = "hold:performance:"
private const val PERFORMANCE_SEAT_EVENT_VERSION_KEY_PREFIX = "performance:venue-seat-event-version:"

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
@DisplayName("실제 STOMP 예매 및 결제 통합 테스트")
class ReservationStompCheckoutIntegrationTest {
  @LocalServerPort
  private var port: Int = 0

  @Autowired
  private lateinit var userRepository: UserRepository

  @Autowired
  private lateinit var venueRepository: VenueRepository

  @Autowired
  private lateinit var venueSeatRepository: VenueSeatRepository

  @Autowired
  private lateinit var concertRepository: ConcertRepository

  @Autowired
  private lateinit var performanceRepository: PerformanceRepository

  @Autowired
  private lateinit var reservationRepository: ReservationRepository

  @Autowired
  private lateinit var reservationSeatRepository: ReservationSeatRepository

  @Autowired
  private lateinit var jwtTokenProvider: JwtTokenProvider

  @Autowired
  private lateinit var stringRedisTemplate: StringRedisTemplate

  @Autowired
  private lateinit var jdbcTemplate: JdbcTemplate

  @Autowired
  private lateinit var objectMapper: ObjectMapper

  @Autowired
  @Qualifier("webSocketSessionTaskScheduler")
  private lateinit var webSocketTaskScheduler: TaskScheduler

  @MockitoBean
  private lateinit var paymentGateway: PaymentGateway

  private lateinit var fixture: Fixture
  private lateinit var stompClient: WebSocketStompClient
  private val clients = mutableListOf<StompTestClient>()
  private val accessSessionKeys = mutableSetOf<String>()
  private val reviewTokens = ConcurrentHashMap<String, UUID>()

  @BeforeEach
  fun setUp() {
    fixture = createFixture()
    stompClient = WebSocketStompClient(StandardWebSocketClient()).apply {
      messageConverter = JacksonJsonMessageConverter()
      taskScheduler = webSocketTaskScheduler
      defaultHeartbeat = longArrayOf(0, 0)
    }
  }

  @AfterEach
  fun tearDown() {
    clients.forEach { runCatching { it.session.disconnect() } }
    clients.clear()
    stompClient.stop()

    accessSessionKeys.forEach(stringRedisTemplate::delete)
    accessSessionKeys.clear()
    clearSeatHolds()
    reviewTokens.clear()

    jdbcTemplate.update("DELETE FROM outbox_events WHERE performance_id = ?", fixture.performance.id)
    jdbcTemplate.update("DELETE FROM reservation_seats WHERE performance_id = ?", fixture.performance.id)
    jdbcTemplate.update("DELETE FROM reservations WHERE performance_id = ?", fixture.performance.id)
    jdbcTemplate.update("DELETE FROM performances WHERE id = ?", fixture.performance.id)
    jdbcTemplate.update("DELETE FROM concerts WHERE id = ?", fixture.concert.id)
    jdbcTemplate.update("DELETE FROM venue_seats WHERE venue_id = ?", fixture.venue.id)
    jdbcTemplate.update("DELETE FROM venues WHERE id = ?", fixture.venue.id)
    jdbcTemplate.update("DELETE FROM users WHERE id IN (?, ?)", fixture.userA.id, fixture.userB.id)
  }

  @Test
  fun `두 사용자의 예매 및 결제 승인이 성공하면 각각 SUCCEEDED로 완료된다`() {
    val clientA = connect(fixture.userA, fixture.sessionIdA)
    val clientB = connect(fixture.userB, fixture.sessionIdB)
    val performanceId = fixture.performance.id
    val holdQueue = "/user/queue/performances/$performanceId/hold-seats"

    clientA.subscribe(holdQueue)
    clientB.subscribe(holdQueue)
    clientA.awaitSubscriptions()
    clientB.awaitSubscriptions()

    val seatA = fixture.seats[0]
    val seatB = fixture.seats[1]
    val holdResponseA = holdSeat(clientA, fixture.sessionIdA, seatA.id)
    val holdResponseB = holdSeat(clientB, fixture.sessionIdB, seatB.id)
    assertThat(holdResponseA.path("success").asBoolean()).isTrue()
    assertThat(holdResponseB.path("success").asBoolean()).isTrue()
    assertThat(holdResponseA.path("data").path("venueSeatIds").arrayLongs()).containsExactly(seatA.id)
    assertThat(holdResponseB.path("data").path("venueSeatIds").arrayLongs()).containsExactly(seatB.id)

    given(paymentGateway.confirm(anyString(), anyString(), anyInt())).willAnswer { invocation ->
      ExternalPayment(
        paymentKey = invocation.arguments[0] as String,
        orderId = invocation.arguments[1] as String,
        amount = invocation.arguments[2] as Int,
        status = ExternalPaymentStatus.DONE,
      )
    }

    val checkoutResults = runTogetherWithResults(
      first = { completeCheckout(clientA, fixture.sessionIdA, seatA.id) },
      second = { completeCheckout(clientB, fixture.sessionIdB, seatB.id) },
    )

    assertThat(checkoutResults.map { it.path("data").path("status").asString() })
      .containsExactlyInAnyOrder(ReservationStatus.SUCCEEDED.name, ReservationStatus.SUCCEEDED.name)
    val reservationIds = checkoutResults.map { it.path("data").path("reservationId").asLong() }
    assertThat(reservationIds).doesNotHaveDuplicates()
    assertThat(
      jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM reservations WHERE performance_id = ?",
        Long::class.java,
        performanceId,
      ),
    ).isEqualTo(2L)
    assertThat(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = performanceId,
        statuses = listOf(ReservationStatus.SUCCEEDED),
      ),
    ).containsExactlyInAnyOrder(seatA.id, seatB.id)
    reservationIds.forEach { reservationId ->
      assertThat(reservationRepository.findById(reservationId).orElseThrow().status)
        .isEqualTo(ReservationStatus.SUCCEEDED)
    }
    verify(paymentGateway, times(2)).confirm(anyString(), anyString(), anyInt())
    clientA.assertNoPendingResponses()
    clientB.assertNoPendingResponses()
  }

  @Test
  fun `같은 결제 승인 요청을 재전송해도 예매와 결제 처리는 중복되지 않는다`() {
    val client = connect(fixture.userA, fixture.sessionIdA)
    val holdQueue = "/user/queue/performances/${fixture.performance.id}/hold-seats"
    client.subscribe(holdQueue)
    client.awaitSubscriptions()
    assertThat(holdSeat(client, fixture.sessionIdA, fixture.seats.first().id).path("success").asBoolean()).isTrue()

    val checkout = prepareCheckout(client, fixture.sessionIdA, fixture.seats.first().id)
    val paymentKey = "test-idempotent-payment-${UUID.randomUUID()}"
    given(paymentGateway.confirm(anyString(), anyString(), anyInt())).willAnswer { invocation ->
      ExternalPayment(
        paymentKey = invocation.arguments[0] as String,
        orderId = invocation.arguments[1] as String,
        amount = invocation.arguments[2] as Int,
        status = ExternalPaymentStatus.DONE,
      )
    }

    val firstResponse = confirmPayment(client, checkout, paymentKey)
    val retryResponse = confirmPayment(client, checkout, paymentKey)

    assertThat(firstResponse.path("success").asBoolean()).isTrue()
    assertThat(retryResponse.path("success").asBoolean()).isTrue()
    assertThat(firstResponse.path("data").path("status").asString()).isEqualTo(ReservationStatus.SUCCEEDED.name)
    assertThat(retryResponse.path("data").path("status").asString()).isEqualTo(ReservationStatus.SUCCEEDED.name)
    assertThat(firstResponse.path("data").path("reservationId").asLong()).isEqualTo(checkout.reservationId)
    assertThat(retryResponse.path("data").path("reservationId").asLong()).isEqualTo(checkout.reservationId)
    assertThat(reservationRepository.findById(checkout.reservationId).orElseThrow().paymentKey).isEqualTo(paymentKey)
    assertThat(
      jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM reservations WHERE performance_id = ?",
        Long::class.java,
        fixture.performance.id,
      ),
    ).isEqualTo(1L)
    assertThat(
      jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM reservations WHERE payment_key = ?",
        Long::class.java,
        paymentKey,
      ),
    ).isEqualTo(1L)
    assertThat(
      jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM reservation_seats WHERE reservation_id = ?",
        Long::class.java,
        checkout.reservationId,
      ),
    ).isEqualTo(1L)
    verify(paymentGateway, times(1)).confirm(anyString(), anyString(), anyInt())
    client.assertNoPendingResponses()
  }

  @Test
  fun `결제 금액이 예매 금액과 다르면 승인을 거부하고 결제 대기를 유지한다`() {
    val client = connect(fixture.userA, fixture.sessionIdA)
    val holdQueue = "/user/queue/performances/${fixture.performance.id}/hold-seats"
    client.subscribe(holdQueue)
    client.awaitSubscriptions()
    assertThat(holdSeat(client, fixture.sessionIdA, fixture.seats.first().id).path("success").asBoolean()).isTrue()

    val checkout = prepareCheckout(client, fixture.sessionIdA, fixture.seats.first().id)
    val response = client.sendAndAwait(
      destination = "/api/reservation/confirm-payment",
      responseDestination = "/user/queue/reservation/confirm-payment",
      requestId = UUID.randomUUID(),
      data = mapOf(
        "paymentKey" to "test-invalid-amount-${UUID.randomUUID()}",
        "orderId" to checkout.orderId,
        "amount" to checkout.amount + 1,
      ),
    )

    assertThat(response.path("success").asBoolean()).isFalse()
    assertThat(response.path("error").path("code").asString()).isEqualTo("BAD_REQUEST")
    assertThat(response.path("error").path("message").asString()).isEqualTo("결제 금액이 일치하지 않습니다.")
    assertThat(reservationRepository.findById(checkout.reservationId).orElseThrow().status)
      .isEqualTo(ReservationStatus.PAYMENT_PENDING)
    assertThat(
      reservationSeatRepository.findVenueSeatIdsByPerformanceIdAndReservationStatusIn(
        performanceId = fixture.performance.id,
        statuses = listOf(ReservationStatus.SUCCEEDED),
      ),
    ).isEmpty()
    verify(paymentGateway, never()).confirm(anyString(), anyString(), anyInt())
  }

  private fun holdSeat(client: StompTestClient, sessionId: UUID, seatId: Long): JsonNode {
    val performanceId = fixture.performance.id
    val destination = "/user/queue/performances/$performanceId/hold-seats"
    val requestId = UUID.randomUUID()
    client.send(
      destination = "/api/performances/$performanceId/hold-seats",
      requestId = requestId,
      data = listOf(seatId),
      fields = mapOf("sessionId" to sessionId.toString()),
    )
    return client.awaitResponse(destination, requestId)
  }

  private fun completeCheckout(client: StompTestClient, sessionId: UUID, expectedSeatId: Long): JsonNode {
    val checkout = prepareCheckout(client, sessionId, expectedSeatId)
    val paymentKey = "test-payment-${UUID.randomUUID()}"
    return confirmPayment(client, checkout, paymentKey)
      .also { assertThat(it.path("success").asBoolean()).isTrue() }
  }

  private fun confirmPayment(client: StompTestClient, checkout: PreparedCheckout, paymentKey: String): JsonNode = client.sendAndAwait(
    destination = "/api/reservation/confirm-payment",
    responseDestination = "/user/queue/reservation/confirm-payment",
    requestId = UUID.randomUUID(),
    data = mapOf(
      "paymentKey" to paymentKey,
      "orderId" to checkout.orderId,
      "amount" to checkout.amount,
    ),
  )

  private fun prepareCheckout(client: StompTestClient, sessionId: UUID, expectedSeatId: Long): PreparedCheckout {
    val performanceId = fixture.performance.id
    val reviewToken = UUID.randomUUID()
    val beginQueue = "/user/queue/reservation/begin-checkout-review"
    val beginRequestId = UUID.randomUUID()
    client.subscribe(beginQueue)
    client.awaitSubscriptions()
    val beginResponse = client.sendAndAwait(
      destination = "/api/reservation/begin-checkout-review",
      responseDestination = beginQueue,
      requestId = beginRequestId,
      data = mapOf(
        "performanceId" to performanceId,
        "reviewToken" to reviewToken.toString(),
        "sessionId" to sessionId.toString(),
      ),
    )
    assertThat(beginResponse.path("success").asBoolean()).isTrue()
    assertThat(beginResponse.path("data").path("venueSeatIds").arrayLongs())
      .containsExactly(expectedSeatId)

    val groupId = beginResponse.path("data").path("groupId").asString()
    reviewTokens[groupId] = reviewToken
    val startQueue = "/user/queue/reservation/start-checkout"
    val startResponse = client.sendAndAwait(
      destination = "/api/reservation/start-checkout",
      responseDestination = startQueue,
      requestId = UUID.randomUUID(),
      data = mapOf(
        "performanceId" to performanceId,
        "reviewToken" to reviewToken.toString(),
        "groupId" to groupId,
      ),
    )
    assertThat(startResponse.path("success").asBoolean()).isTrue()

    val reservationId = startResponse.path("data").path("reservationId").asLong()
    val orderId = startResponse.path("data").path("orderId").asString()
    val orderQueue = "/user/queue/reservation/get-payment-order"
    val orderResponse = client.sendAndAwait(
      destination = "/api/reservation/get-payment-order",
      responseDestination = orderQueue,
      requestId = UUID.randomUUID(),
      data = mapOf("reservationId" to reservationId),
    )
    assertThat(orderResponse.path("success").asBoolean()).isTrue()
    assertThat(orderResponse.path("data").path("orderId").asString()).isEqualTo(orderId)
    assertThat(orderResponse.path("data").path("seats").get(0).path("venueSeatId").asLong())
      .isEqualTo(expectedSeatId)

    return PreparedCheckout(
      reservationId = reservationId,
      orderId = orderId,
      amount = orderResponse.path("data").path("amount").asInt(),
    )
  }

  private fun connect(user: User, sessionId: UUID): StompTestClient {
    val token = jwtTokenProvider.generateAccessToken(user.id, UserRole.USER)
    val tokenPayload = jwtTokenProvider.parseAccessTokenPayload(token)!!
    val redisKey = "$ACCESS_SESSION_KEY_PREFIX${tokenPayload.tokenId}"
    stringRedisTemplate.opsForValue().set(redisKey, user.id.toString(), Duration.ofMinutes(10))
    accessSessionKeys += redisKey

    val handshakeHeaders = WebSocketHttpHeaders().apply {
      add(HttpHeaders.COOKIE, "access_token=$token")
      add(HttpHeaders.ORIGIN, "http://localhost:5173")
    }
    val session = stompClient.connectAsync(
      URI.create("ws://localhost:$port/ws"),
      handshakeHeaders,
      StompHeaders(),
      object : StompSessionHandlerAdapter() {},
    ).get(10, TimeUnit.SECONDS)
    return StompTestClient(session, fixture.performance.id, sessionId).also(clients::add)
  }

  private fun createFixture(): Fixture {
    val suffix = UUID.randomUUID().toString()
    val userA = userRepository.save(User(email = "stomp-a-$suffix@example.com", nickname = "STOMP A"))
    val userB = userRepository.save(User(email = "stomp-b-$suffix@example.com", nickname = "STOMP B"))
    val venue = venueRepository.save(
      Venue(
        name = "STOMP 테스트 공연장 $suffix",
        address = "테스트 주소",
        width = BigDecimal("100.00"),
        height = BigDecimal("100.00"),
        stagePositionX = BigDecimal("30.00"),
        stagePositionY = BigDecimal("7.50"),
        stageWidth = BigDecimal("40.00"),
        stageHeight = BigDecimal("15.00"),
      ),
    )
    val seats = listOf(1, 2).map { number ->
      venueSeatRepository.save(
        VenueSeat(
          venue = venue,
          sectionName = "A구역",
          seatNumber = number,
          seatLabel = "A구역 1열 ${number}번",
          price = 100_000,
          positionX = BigDecimal((20 + number * 5).toString()),
          positionY = BigDecimal("25.00"),
        ),
      )
    }
    val concert = concertRepository.save(
      Concert(
        venue = venue,
        title = "STOMP 테스트 공연 $suffix",
        genre = ConcertGenre.INDIE,
      ),
    )
    val performance = performanceRepository.save(
      Performance(
        concert = concert,
        name = "테스트 회차",
        startsAt = LocalDateTime.now().plusDays(30),
        bookingOpensAt = LocalDateTime.now().minusDays(1),
      ),
    )

    return Fixture(
      userA = userA,
      userB = userB,
      venue = venue,
      seats = seats,
      concert = concert,
      performance = performance,
      sessionIdA = UUID.randomUUID(),
      sessionIdB = UUID.randomUUID(),
    )
  }

  private fun clearSeatHolds() {
    val performanceId = fixture.performance.id
    val groupIds = listOf(
      "${fixture.userA.id}:$performanceId:${fixture.sessionIdA}",
      "${fixture.userB.id}:$performanceId:${fixture.sessionIdB}",
    )
    val keys = mutableSetOf(
      "$HOLD_PERFORMANCE_KEY_PREFIX$performanceId",
      "$PERFORMANCE_SEAT_EVENT_VERSION_KEY_PREFIX$performanceId",
    )

    fixture.seats.forEach { seat ->
      val seatKey = "$SEAT_HOLD_KEY_PREFIX$performanceId:${seat.id}"
      stringRedisTemplate.opsForValue().get(seatKey)?.let { holdId ->
        keys += "$HOLD_DETAIL_KEY_PREFIX$holdId"
        keys += "$HOLD_EXPIRY_KEY_PREFIX$holdId"
      }
      keys += seatKey
      keys += "hold:venue-seat-finalizing:$performanceId:${seat.id}"
    }
    groupIds.forEach { groupId ->
      keys += "$HOLD_GROUP_KEY_PREFIX$groupId"
      keys += "$HOLD_GROUP_CONTROL_KEY_PREFIX$groupId"
      reviewTokens[groupId]?.let { token ->
        keys += "$HOLD_GROUP_REVIEW_RESULT_KEY_PREFIX$groupId:$token"
      }
    }
    stringRedisTemplate.delete(keys)
  }

  private fun runTogetherWithResults(first: () -> JsonNode, second: () -> JsonNode): List<JsonNode> {
    val barrier = CyclicBarrier(2)
    val executor = Executors.newFixedThreadPool(2)
    try {
      val tasks = listOf(first, second).map { action ->
        executor.submit<JsonNode> {
          barrier.await(5, TimeUnit.SECONDS)
          action()
        }
      }
      return tasks.map { it.get(30, TimeUnit.SECONDS) }
    } finally {
      executor.shutdownNow()
    }
  }

  private inner class StompTestClient(val session: StompSession, private val performanceId: Long, private val sessionId: UUID) {
    private val responseQueues = mutableMapOf<String, BlockingQueue<JsonNode>>()

    fun subscribe(destination: String) {
      val queue = responseQueues.getOrPut(destination) { LinkedBlockingQueue() }
      val headers = StompHeaders().apply { this.destination = destination }
      session.subscribe(headers, jsonFrameHandler(queue))
    }

    fun awaitSubscriptions() {
      // 단순 브로커는 SUBSCRIBE 영수증을 보내지 않는다. 서버가 세션별 수신 순서를 보장하므로,
      // 좌석 상태 응답을 받으면 그보다 먼저 보낸 구독이 모두 등록된 것이다.
      val statusQueue = "/user/queue/performances/$performanceId/get-seat-status"
      if (statusQueue !in responseQueues) {
        subscribe(statusQueue)
      }
      val requestId = UUID.randomUUID()
      send(
        destination = "/api/performances/$performanceId/get-seat-status",
        requestId = requestId,
        data = null,
        fields = mapOf("sessionId" to sessionId.toString()),
      )
      val response = awaitResponse(statusQueue, requestId)
      assertThat(response.path("success").asBoolean()).isTrue()
    }

    fun send(destination: String, requestId: UUID, data: Any?, fields: Map<String, Any?> = emptyMap()) {
      val headers = StompHeaders().apply {
        this.destination = destination
        contentType = MediaType.APPLICATION_JSON
      }
      session.send(headers, mapOf("requestId" to requestId.toString(), "data" to data) + fields)
    }

    fun sendAndAwait(destination: String, responseDestination: String, requestId: UUID, data: Map<String, Any?>): JsonNode {
      if (responseDestination !in responseQueues) {
        subscribe(responseDestination)
        awaitSubscriptions()
      }
      send(destination, requestId, data)
      return awaitResponse(responseDestination, requestId)
    }

    fun awaitResponse(destination: String, requestId: UUID): JsonNode {
      val response = responseQueues[destination]?.poll(10, TimeUnit.SECONDS)
        ?: throw AssertionError("STOMP 응답 제한 시간 초과: $destination, requestId=$requestId")
      assertThat(response.path("requestId").asString()).isEqualTo(requestId.toString())
      return response
    }

    fun assertNoPendingResponses() {
      responseQueues.forEach { (destination, queue) ->
        assertThat(queue.poll()).describedAs("Unexpected response on $destination").isNull()
      }
    }

    private fun jsonFrameHandler(queue: BlockingQueue<JsonNode>) = object : StompFrameHandler {
      override fun getPayloadType(headers: StompHeaders): Type = JsonNode::class.java

      override fun handleFrame(headers: StompHeaders, payload: Any?) {
        (payload as? JsonNode)?.let(queue::offer)
      }
    }
  }

  private data class Fixture(
    val userA: User,
    val userB: User,
    val venue: Venue,
    val seats: List<VenueSeat>,
    val concert: Concert,
    val performance: Performance,
    val sessionIdA: UUID,
    val sessionIdB: UUID,
  )

  private data class PreparedCheckout(val reservationId: Long, val orderId: String, val amount: Int)

  private fun JsonNode.arrayLongs(): List<Long> = arrayValues().map { it.asLong() }

  private fun JsonNode.arrayValues(): List<JsonNode> = iterator().asSequence().toList()
}

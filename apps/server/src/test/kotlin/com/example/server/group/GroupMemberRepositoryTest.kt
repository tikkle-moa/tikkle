package com.example.server.group

import com.example.server.auth.entity.User
import com.example.server.auth.repository.UserRepository
import com.example.server.concert.entity.Concert
import com.example.server.concert.repository.ConcertRepository
import com.example.server.concert.types.ConcertGenre
import com.example.server.config.TestcontainersConfig
import com.example.server.group.entity.Group
import com.example.server.group.entity.GroupMember
import com.example.server.group.repository.GroupMemberRepository
import com.example.server.group.repository.GroupRepository
import com.example.server.performance.entity.Performance
import com.example.server.performance.repository.PerformanceRepository
import com.example.server.venue.entity.Venue
import com.example.server.venue.repository.VenueRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.LocalDateTime
import java.time.ZoneOffset
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfig::class)
@Transactional
class GroupMemberRepositoryTest {
  @Autowired
  lateinit var groupMemberRepository: GroupMemberRepository

  @Autowired
  lateinit var groupRepository: GroupRepository

  @Autowired
  lateinit var userRepository: UserRepository

  @Autowired
  lateinit var performanceRepository: PerformanceRepository

  @Autowired
  lateinit var concertRepository: ConcertRepository

  @Autowired
  lateinit var venueRepository: VenueRepository

  @Test
  fun `사용자와 공연에 연결된 활성 그룹 ID를 조회한다`() {
    val user = userRepository.save(user())
    val performance = performanceRepository.save(performance())
    val group = groupRepository.save(group(performance, utcNow().plusMinutes(10)))
    groupMemberRepository.save(GroupMember(group = group, member = user))
    groupMemberRepository.flush()

    val result = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(user.id, performance.id)

    assertThat(result).isEqualTo(group.id)
  }

  @Test
  fun `만료된 그룹은 조회하지 않는다`() {
    val user = userRepository.save(user())
    val performance = performanceRepository.save(performance())
    val group = groupRepository.save(group(performance, utcNow().minusMinutes(10)))
    groupMemberRepository.save(GroupMember(group = group, member = user))
    groupMemberRepository.flush()

    val result = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(user.id, performance.id)

    assertThat(result).isNull()
  }

  @Test
  fun `다른 공연에 속한 그룹은 조회하지 않는다`() {
    val user = userRepository.save(user())
    val targetPerformance = performanceRepository.save(performance())
    val otherPerformance = performanceRepository.save(performance())
    val group = groupRepository.save(group(otherPerformance, utcNow().plusMinutes(10)))
    groupMemberRepository.save(GroupMember(group = group, member = user))
    groupMemberRepository.flush()

    val result = groupMemberRepository.findActiveGroupIdByUserIdAndPerformanceId(user.id, targetPerformance.id)

    assertThat(result).isNull()
  }

  private fun group(performance: Performance, expiresAt: LocalDateTime): Group = Group(
    performance = performance,
    expiresAt = expiresAt,
  )

  private fun utcNow(): LocalDateTime = LocalDateTime.now(ZoneOffset.UTC)

  private fun user(): User = User(
    email = "group-member-${UUID.randomUUID()}@example.com",
    nickname = "그룹 구성원",
  )

  private fun performance(): Performance = Performance(
    concert = concertRepository.save(concert()),
    name = "1회차",
    startsAt = LocalDateTime.now().plusDays(1),
  )

  private fun concert(): Concert = Concert(
    venue = venueRepository.save(venue()),
    title = "그룹 테스트 공연",
    genre = ConcertGenre.BALLAD,
  )

  private fun venue(): Venue = Venue(
    name = "그룹 테스트 공연장",
    address = "서울",
    width = BigDecimal("100.00"),
    height = BigDecimal("100.00"),
    stagePositionX = BigDecimal("50.00"),
    stagePositionY = BigDecimal("10.00"),
    stageWidth = BigDecimal("40.00"),
    stageHeight = BigDecimal("10.00"),
  )
}

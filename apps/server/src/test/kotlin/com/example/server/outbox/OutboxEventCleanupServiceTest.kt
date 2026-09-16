package com.example.server.outbox

import com.example.server.outbox.repository.OutboxEventRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.domain.PageRequest
import java.time.LocalDateTime

@ExtendWith(MockitoExtension::class)
class OutboxEventCleanupServiceTest {
  @Mock
  lateinit var outboxEventRepository: OutboxEventRepository

  @InjectMocks
  lateinit var service: OutboxEventCleanupService

  @Test
  fun `공연 시작일 기준 보존 기간이 지난 PUBLISHED 이벤트만 batch 단위로 삭제한다`() {
    val performanceStartedBefore = LocalDateTime.of(2026, 7, 16, 0, 0)
    given(
      outboxEventRepository.findPublishedIdsForCleanup(
        status = "PUBLISHED",
        performanceStartedBefore = performanceStartedBefore,
        pageable = PageRequest.of(0, 100),
      ),
    ).willReturn(listOf(1L, 2L))

    val deletedCount = service.deletePublishedBefore(performanceStartedBefore, 100)

    assertThat(deletedCount).isEqualTo(2)
    then(outboxEventRepository).should().deleteAllByIdInBatch(listOf(1L, 2L))
  }

  @Test
  fun `정리 대상이 없으면 삭제하지 않는다`() {
    val performanceStartedBefore = LocalDateTime.of(2026, 7, 16, 0, 0)
    given(
      outboxEventRepository.findPublishedIdsForCleanup(
        status = "PUBLISHED",
        performanceStartedBefore = performanceStartedBefore,
        pageable = PageRequest.of(0, 100),
      ),
    ).willReturn(emptyList())

    assertThat(service.deletePublishedBefore(performanceStartedBefore, 100)).isZero()
    then(outboxEventRepository).should().findPublishedIdsForCleanup(
      status = "PUBLISHED",
      performanceStartedBefore = performanceStartedBefore,
      pageable = PageRequest.of(0, 100),
    )
    then(outboxEventRepository).shouldHaveNoMoreInteractions()
  }

  @Test
  fun `batch size가 0 이하면 예외를 던진다`() {
    val exception = assertThrows<IllegalArgumentException> {
      service.deletePublishedBefore(LocalDateTime.of(2026, 7, 16, 0, 0), 0)
    }

    assertThat(exception).hasMessage("Outbox 정리 batchSize는 0보다 커야 합니다.")
  }
}

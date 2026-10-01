package com.example.server.group

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.ArgumentCaptor
import org.mockito.BDDMockito.given
import org.mockito.BDDMockito.then
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.data.redis.core.ValueOperations

@ExtendWith(MockitoExtension::class)
class RedisGroupServiceTest {
  @Mock lateinit var stringRedisTemplate: StringRedisTemplate

  @Mock lateinit var valueOperations: ValueOperations<String, String>

  @Test
  fun `공연과 사용자에 연결된 그룹 ID를 반환한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("group:$PERFORMANCE_ID:user:$USER_ID")).willReturn(GROUP_ID)

    val groupId = RedisGroupService(stringRedisTemplate).getGroupId(USER_ID, PERFORMANCE_ID)

    assertThat(groupId).isEqualTo(GROUP_ID)
  }

  @Test
  fun `그룹에 속하지 않은 사용자는 null을 반환한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)
    given(valueOperations.get("group:$PERFORMANCE_ID:user:$USER_ID")).willReturn(null)

    val groupId = RedisGroupService(stringRedisTemplate).getGroupId(USER_ID, PERFORMANCE_ID)

    assertThat(groupId).isNull()
  }

  @Test
  fun `공연과 사용자로 구성한 역인덱스 키를 조회한다`() {
    given(stringRedisTemplate.opsForValue()).willReturn(valueOperations)

    RedisGroupService(stringRedisTemplate).getGroupId(USER_ID, PERFORMANCE_ID)

    val key = ArgumentCaptor.forClass(String::class.java)
    then(valueOperations).should().get(key.capture())
    assertThat(key.value).isEqualTo("group:$PERFORMANCE_ID:user:$USER_ID")
  }

  companion object {
    private const val USER_ID = 1L
    private const val PERFORMANCE_ID = 10L
    private const val GROUP_ID = "group-1"
  }
}

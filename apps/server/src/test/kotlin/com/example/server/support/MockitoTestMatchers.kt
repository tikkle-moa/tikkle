package com.example.server.support

import org.mockito.ArgumentMatchers

/**
 * Java Mockito matcher를 Kotlin 테스트에서 사용할 때 필요한 공용 wrapper.
 * 반환값은 실제로 사용되지 않고 Mockito matcher 등록에만 사용된다.
 */
@Suppress("UNCHECKED_CAST")
fun <T> any(type: Class<T>): T = ArgumentMatchers.any(type)

inline fun <reified T> any(): T = ArgumentMatchers.any()

/**
 * Mockito matcher는 null을 반환하므로 Kotlin non-null 파라미터에 직접 전달할 수 없다.
 * matcher를 등록한 뒤 호출부에서 사용할 non-null 대체값을 반환한다.
 */
fun <T : Any> anyNonNull(type: Class<T>, fallback: T): T {
  ArgumentMatchers.any(type)
  return fallback
}

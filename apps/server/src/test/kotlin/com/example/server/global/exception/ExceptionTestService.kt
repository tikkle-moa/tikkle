package com.example.server.global.exception

import jakarta.validation.constraints.Min
import org.springframework.stereotype.Service
import org.springframework.validation.annotation.Validated

@Validated
@Service
class ExceptionTestService {

  fun validatePage(
    @Min(value = 1, message = "page는 1 이상이어야 합니다.")
    page: Int,
  ): Int = page
}

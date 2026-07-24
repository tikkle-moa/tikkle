package com.example.server.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {
  @Bean
  fun openApi(): OpenAPI = OpenAPI().info(
    Info()
      .title("Tikkle API")
      .description("Tikkle 콘서트 예매 서비스 API 문서입니다.")
      .version("v1"),
  )
}

package com.example.server.config

import org.springframework.context.annotation.Configuration
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.util.pattern.PathPatternParser

@Configuration
class WebConfig : WebMvcConfigurer {
  override fun configurePathMatch(configurer: PathMatchConfigurer) {
    configurer
      .setPatternParser(PathPatternParser())
      .addPathPrefix("/api") { it.isAnnotationPresent(RestController::class.java) }
  }
}

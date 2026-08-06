package com.example.server.config

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.types.UserRole
import com.example.server.config.properties.AppProperties
import com.example.server.global.security.JwtAuthenticationFilter
import com.example.server.global.security.RestAccessDeniedHandler
import com.example.server.global.security.RestAuthenticationEntryPoint
import com.example.server.global.security.RestCorsProcessor
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.provisioning.InMemoryUserDetailsManager
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.csrf.CsrfFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.filter.CorsFilter
import tools.jackson.databind.ObjectMapper

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig(
  private val jwtTokenProvider: JwtTokenProvider,
  private val authenticationEntryPoint: RestAuthenticationEntryPoint,
  private val accessDeniedHandler: RestAccessDeniedHandler,
  private val appProperties: AppProperties,
) {
  @Bean
  fun securityFilterChain(
    http: HttpSecurity,
    corsConfigurationSource: UrlBasedCorsConfigurationSource,
    objectMapper: ObjectMapper,
  ): SecurityFilterChain {
    val corsFilter = CorsFilter(corsConfigurationSource).apply {
      setCorsProcessor(RestCorsProcessor(objectMapper))
    }
    val jwtAuthenticationFilter = JwtAuthenticationFilter(jwtTokenProvider)

    http
      .cors { it.disable() }
      .csrf { it.spa() }
      .sessionManagement {
        it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      }
      .authorizeHttpRequests {
        it
          .requestMatchers(HttpMethod.GET, "/api/auth/oauth/**").permitAll()
          .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
          .requestMatchers(HttpMethod.POST, "/api/auth/refresh", "/api/auth/logout").permitAll()
          .requestMatchers("/api/v3/api-docs/**", "/swagger-ui/**", "/actuator/health").permitAll()
          .anyRequest().hasRole(UserRole.ADMIN.name)
      }
      .exceptionHandling {
        it.authenticationEntryPoint(authenticationEntryPoint)
        it.accessDeniedHandler(accessDeniedHandler)
      }
      .formLogin { it.disable() }
      .httpBasic { it.disable() }
      .logout { it.disable() }
      .addFilterBefore(corsFilter, CsrfFilter::class.java)
      .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

    return http.build()
  }

  @Bean
  fun corsConfigurationSource(): UrlBasedCorsConfigurationSource {
    val configuration = CorsConfiguration().apply {
      allowedOrigins = listOf(appProperties.frontendUrl)
      allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE")
      allowedHeaders = listOf("Content-Type", "X-XSRF-TOKEN")
      allowCredentials = true
    }

    return UrlBasedCorsConfigurationSource().apply {
      registerCorsConfiguration("/api/**", configuration)
    }
  }

  // UserDetailsServiceAutoConfiguration 백오프를 위한 no-op 빈
  @Bean
  fun userDetailsService() = InMemoryUserDetailsManager()
}

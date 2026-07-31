package com.example.server.config

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.security.JwtAuthenticationFilter
import com.example.server.auth.security.RestAuthenticationEntryPoint
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter

@Configuration
class SecurityConfig(private val jwtTokenProvider: JwtTokenProvider, private val authenticationEntryPoint: RestAuthenticationEntryPoint) {
  @Bean
  fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
    val jwtAuthenticationFilter = JwtAuthenticationFilter(
      jwtTokenProvider,
    )

    http
      .sessionManagement {
        it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      }
      .authorizeHttpRequests {
        it
          .requestMatchers("/api/auth/oauth/**")
          .permitAll()
          .requestMatchers("/api/auth/refresh")
          .permitAll()
          .requestMatchers(
            HttpMethod.GET,
            "/api/concerts/**",
            "/api/performances/**",
          )
          .permitAll()
          .requestMatchers(
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/actuator/health",
          )
          .permitAll()
          .anyRequest()
          .authenticated()
      }
      .exceptionHandling {
        it.authenticationEntryPoint(authenticationEntryPoint)
      }
      .formLogin {
        it.disable()
      }
      .httpBasic {
        it.disable()
      }
      .logout {
        it.disable()
      }
      .addFilterBefore(
        jwtAuthenticationFilter,
        UsernamePasswordAuthenticationFilter::class.java,
      )

    return http.build()
  }
}

package com.example.server.config

import com.example.server.auth.JwtTokenProvider
import com.example.server.auth.types.UserRole
import com.example.server.global.security.JwtAuthenticationFilter
import com.example.server.global.security.RestAccessDeniedHandler
import com.example.server.global.security.RestAuthenticationEntryPoint
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

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
class SecurityConfig(
  private val jwtTokenProvider: JwtTokenProvider,
  private val authenticationEntryPoint: RestAuthenticationEntryPoint,
  private val accessDeniedHandler: RestAccessDeniedHandler,
) {
  @Bean
  fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
    val jwtAuthenticationFilter = JwtAuthenticationFilter(jwtTokenProvider)

    http
      .csrf { it.spa() }
      .sessionManagement {
        it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
      }
      .authorizeHttpRequests {
        it
          .requestMatchers(HttpMethod.GET, "/api/auth/oauth/**").permitAll()
          .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
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
      .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

    return http.build()
  }

  // UserDetailsServiceAutoConfiguration 백오프를 위한 no-op 빈
  @Bean
  fun userDetailsService() = InMemoryUserDetailsManager()
}

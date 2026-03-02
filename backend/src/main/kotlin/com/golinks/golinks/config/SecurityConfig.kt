package com.golinks.golinks.config

import com.golinks.golinks.security.JwtAuthenticationFilter
import com.golinks.golinks.security.RateLimitFilter
import com.golinks.golinks.security.RequestLoggingFilter
import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
    private val jwtAuthenticationFilter: JwtAuthenticationFilter,
    private val rateLimitFilter: RateLimitFilter,
    private val corsConfigurationSource: CorsConfigurationSource
) {

    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    /** Register RequestLoggingFilter as a servlet filter with highest priority */
    @Bean
    fun requestLoggingFilterRegistration(): FilterRegistrationBean<RequestLoggingFilter> {
        val reg = FilterRegistrationBean(RequestLoggingFilter())
        reg.order = Int.MIN_VALUE + 10
        reg.addUrlPatterns("/*")
        return reg
    }

    /** Prevent JwtAuthenticationFilter from being auto-registered as a servlet filter */
    @Bean
    fun jwtFilterRegistration(filter: JwtAuthenticationFilter): FilterRegistrationBean<JwtAuthenticationFilter> {
        val reg = FilterRegistrationBean(filter)
        reg.isEnabled = false
        return reg
    }

    /** Prevent RateLimitFilter from being auto-registered as a servlet filter */
    @Bean
    fun rateLimitFilterRegistration(filter: RateLimitFilter): FilterRegistrationBean<RateLimitFilter> {
        val reg = FilterRegistrationBean(filter)
        reg.isEnabled = false
        return reg
    }

    @Bean
    fun authenticationManager(authConfig: AuthenticationConfiguration): AuthenticationManager =
        authConfig.authenticationManager

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfigurationSource) }
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    // Public auth endpoints
                    .requestMatchers("/api/v1/auth/signup").permitAll()
                    .requestMatchers("/api/v1/auth/login").permitAll()
                    .requestMatchers("/api/v1/auth/refresh").permitAll()
                    .requestMatchers("/api/v1/auth/verify-email").permitAll()
                    .requestMatchers("/api/v1/auth/forgot-password").permitAll()
                    .requestMatchers("/api/v1/auth/reset-password").permitAll()
                    .requestMatchers("/api/v1/auth/oauth2/callback/**").permitAll()
                    // Telemetry (sendBeacon — no auth headers)
                    .requestMatchers(HttpMethod.POST, "/api/v1/analytics/telemetry").permitAll()
                    // Invite validation (public)
                    .requestMatchers("/api/v1/invites/validate").permitAll()
                    // Redirect endpoints (public)
                    .requestMatchers("/go/**").permitAll()
                    // Actuator
                    .requestMatchers("/actuator/**").permitAll()
                    // OPTIONS for CORS preflight
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    // Everything else requires authentication
                    .anyRequest().authenticated()
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)
            .addFilterBefore(rateLimitFilter, jwtAuthenticationFilter::class.java)
            // Disable default form login and httpBasic
            .formLogin { it.disable() }
            .httpBasic { it.disable() }

        return http.build()
    }
}

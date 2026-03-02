package com.golinks.golinks.security

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.slf4j.MDC
import org.springframework.web.filter.OncePerRequestFilter
import java.util.UUID

/**
 * Populates MDC with per-request context (requestId, userId, route, module)
 * and logs request completion timing.
 *
 * Registered via FilterRegistrationBean in SecurityConfig (not as a
 * Spring Security filter) so it wraps the entire request lifecycle.
 */
class RequestLoggingFilter : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(RequestLoggingFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val requestId = request.getHeader("X-Request-Id")
            ?: UUID.randomUUID().toString().substring(0, 8)
        val start = System.currentTimeMillis()

        MDC.put("requestId", requestId)
        MDC.put("route", "${request.method} ${request.requestURI}")
        MDC.put("module", resolveModule(request.requestURI))
        MDC.put("ip", request.remoteAddr)

        // Pass request-id downstream so the JWT filter can populate userId
        response.setHeader("X-Request-Id", requestId)

        try {
            filterChain.doFilter(request, response)
        } finally {
            val duration = System.currentTimeMillis() - start
            MDC.put("durationMs", duration.toString())

            if (log.isInfoEnabled && !request.requestURI.startsWith("/actuator")) {
                log.info(
                    "{} {} {} {}ms",
                    request.method,
                    request.requestURI,
                    response.status,
                    duration
                )
            }

            MDC.clear()
        }
    }

    private fun resolveModule(uri: String): String {
        return when {
            uri.startsWith("/api/v1/auth") -> "auth"
            uri.startsWith("/api/v1/links") -> "links"
            uri.startsWith("/api/v1/analytics") -> "analytics"
            uri.startsWith("/api/v1/audit") -> "audit"
            uri.startsWith("/api/v1/users") -> "users"
            uri.startsWith("/go/") -> "redirect"
            else -> "other"
        }
    }
}

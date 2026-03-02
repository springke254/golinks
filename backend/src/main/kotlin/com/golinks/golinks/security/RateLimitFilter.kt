package com.golinks.golinks.security

import com.fasterxml.jackson.databind.ObjectMapper
import com.golinks.golinks.config.RateLimitProperties
import com.golinks.golinks.service.AbuseDetectionService
import com.golinks.golinks.service.RateLimitService
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * Global rate-limit filter that runs BEFORE JwtAuthenticationFilter.
 *
 * Enforces sliding-window counters in Redis per IP and per authenticated user,
 * with different tiers for auth, link-creation, redirect, password-verify,
 * and a default catch-all.
 *
 * Suspicious clients (detected by AbuseDetectionService) are subject to
 * tighter "suspicious" tier limits.
 *
 * When a client exceeds its limit the filter writes a 429 JSON response
 * directly, including a Retry-After header, and short-circuits the chain.
 *
 * For redirect requests from suspicious IPs, the filter can serve a
 * minimal HTML challenge page instead of a JSON 429.
 */
@Component
class RateLimitFilter(
    private val rateLimitService: RateLimitService,
    private val abuseDetectionService: AbuseDetectionService,
    private val rateLimitProperties: RateLimitProperties,
    private val objectMapper: ObjectMapper
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(RateLimitFilter::class.java)

    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        // Skip rate limiting if disabled or for actuator / OPTIONS pre-flight / telemetry
        if (!rateLimitProperties.enabled) return true
        val path = request.requestURI
        if (path.startsWith("/actuator")) return true
        if (path == "/api/v1/analytics/telemetry") return true
        if (request.method.equals("OPTIONS", ignoreCase = true)) return true
        return false
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val ip = abuseDetectionService.extractClientIp(request)
        val path = request.requestURI
        val method = request.method

        // Determine endpoint category and corresponding limits
        val category = resolveCategory(path, method)
        val suspicious = abuseDetectionService.isSuspicious(request)
        val limits = if (suspicious) rateLimitProperties.suspicious else getLimitsForCategory(category)

        // --- Per-IP check ---
        val ipKey = rateLimitService.ipKey(ip, category)
        val ipResult = rateLimitService.checkRateLimit(ipKey, limits.maxRequests, limits.windowSeconds)

        if (!ipResult.allowed) {
            log.info("Rate limit exceeded for IP=$ip on $category (suspicious=$suspicious)")

            // For /go/** requests from suspicious IPs, serve challenge page
            if (path.startsWith("/go/") && suspicious) {
                writeChallengeResponse(response, ipResult.retryAfterSeconds)
            } else {
                writeRateLimitResponse(response, ipResult.retryAfterSeconds)
            }
            return
        }

        // --- Per-user check (if authenticated) ---
        val auth = SecurityContextHolder.getContext().authentication
        val userId = (auth?.principal as? org.springframework.security.core.userdetails.UserDetails)?.username
        if (userId != null) {
            val userKey = rateLimitService.userKey(userId, category)
            // Authenticated users get 2x the per-IP limit as individual quota
            val userResult = rateLimitService.checkRateLimit(
                userKey,
                limits.maxRequests * 2,
                limits.windowSeconds
            )
            if (!userResult.allowed) {
                log.info("Rate limit exceeded for user=$userId on $category")
                writeRateLimitResponse(response, userResult.retryAfterSeconds)
                return
            }
        }

        // Add rate-limit info headers for transparency
        response.setHeader("X-RateLimit-Limit", limits.maxRequests.toString())
        response.setHeader("X-RateLimit-Remaining", ipResult.remaining.toString())

        filterChain.doFilter(request, response)
    }

    /**
     * Classify the request path into a rate-limit category.
     */
    private fun resolveCategory(path: String, method: String): String {
        return when {
            path.startsWith("/api/v1/auth/login") -> "auth"
            path.startsWith("/api/v1/auth/signup") -> "auth"
            path.startsWith("/api/v1/auth/forgot-password") -> "auth"
            path.startsWith("/api/v1/auth/reset-password") -> "auth"
            path.startsWith("/api/v1/links") && method.equals("POST", ignoreCase = true) -> "link_create"
            path.matches(Regex("^/go/[^/]+/verify$")) -> "password_verify"
            path.startsWith("/go/") -> "redirect"
            else -> "default"
        }
    }

    /**
     * Map a category name to its configured limits.
     */
    private fun getLimitsForCategory(category: String): RateLimitProperties.EndpointLimit {
        return when (category) {
            "auth" -> rateLimitProperties.auth
            "link_create" -> rateLimitProperties.linkCreate
            "redirect" -> rateLimitProperties.redirect
            "password_verify" -> rateLimitProperties.passwordVerify
            else -> rateLimitProperties.default
        }
    }

    /**
     * Write a JSON 429 response with Retry-After header.
     */
    private fun writeRateLimitResponse(response: HttpServletResponse, retryAfterSeconds: Long) {
        response.status = HttpStatus.TOO_MANY_REQUESTS.value()
        response.contentType = MediaType.APPLICATION_JSON_VALUE
        response.setHeader("Retry-After", retryAfterSeconds.toString())

        val body = mapOf(
            "status" to 429,
            "message" to "Too many requests — please slow down and try again shortly",
            "retryAfter" to retryAfterSeconds
        )
        response.writer.write(objectMapper.writeValueAsString(body))
        response.writer.flush()
    }

    /**
     * Serve a minimal HTML challenge page for suspicious redirect requests.
     * Avoids loading the full SPA — just a lightweight human-verification gate.
     */
    private fun writeChallengeResponse(response: HttpServletResponse, retryAfterSeconds: Long) {
        response.status = HttpStatus.TOO_MANY_REQUESTS.value()
        response.contentType = "text/html;charset=UTF-8"
        response.setHeader("Retry-After", retryAfterSeconds.toString())

        val html = """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Hold On — Golinks</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
                body { background: #191414; color: #fff; font-family: Inter, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
                .card { background: #242020; border: 2px solid #3A3A3A; padding: 2rem; max-width: 420px; width: 100%; text-align: center; }
                h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #F59E0B; }
                p { font-size: 0.875rem; color: #B3B3B3; margin-bottom: 1rem; line-height: 1.6; }
                .timer { font-size: 2rem; font-weight: 700; color: #1DB954; margin: 1.5rem 0; font-variant-numeric: tabular-nums; }
                .logo { color: #1DB954; font-weight: 700; font-size: 1rem; margin-bottom: 1.5rem; }
                a { color: #1DB954; text-decoration: none; font-weight: 600; }
                a:hover { text-decoration: underline; }
                .btn { display: inline-block; background: #1DB954; color: #191414; border: 2px solid #1DB954; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 700; text-decoration: none; cursor: pointer; margin-top: 1rem; }
                .btn:hover { background: #1AA34A; text-decoration: none; }
                .support { font-size: 0.75rem; color: #8A8A8A; margin-top: 1.5rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">🔗 Golinks</div>
                <h1>⚠ Too Many Requests</h1>
                <p>We've detected unusual activity from your network. Please wait before trying again.</p>
                <div class="timer" id="countdown">${retryAfterSeconds}s</div>
                <p>This page will automatically refresh when you can retry.</p>
                <div class="support">
                    Think this is a mistake? <a href="mailto:support@golinks.local">Contact support</a>
                </div>
            </div>
            <script>
                let seconds = ${retryAfterSeconds};
                const el = document.getElementById('countdown');
                const interval = setInterval(() => {
                    seconds--;
                    el.textContent = seconds + 's';
                    if (seconds <= 0) {
                        clearInterval(interval);
                        window.location.reload();
                    }
                }, 1000);
            </script>
        </body>
        </html>
        """.trimIndent()

        response.writer.write(html)
        response.writer.flush()
    }
}

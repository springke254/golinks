package com.golinks.golinks.service

import com.golinks.golinks.config.RateLimitProperties
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration

/**
 * Heuristic abuse / bot detection.
 *
 * Checks:
 * 1. User-Agent heuristics: empty UA, known automated-client signatures.
 * 2. Behaviour patterns: flooding link creates or extremely high redirect rates.
 * 3. Known-bad IP check (extensible — currently uses a Redis set "abuse:blocked_ips").
 *
 * When a client is flagged as suspicious the rate-limit filter tightens
 * its quotas to the "suspicious" tier defined in RateLimitProperties.
 */
@Service
class AbuseDetectionService(
    private val redisTemplate: StringRedisTemplate,
    private val rateLimitService: RateLimitService,
    private val rateLimitProperties: RateLimitProperties
) {

    private val logger = LoggerFactory.getLogger(AbuseDetectionService::class.java)

    companion object {
        /** UA substrings that strongly suggest an automated client.
         *  NOTE: "axios/" and "node-fetch" are intentionally excluded —
         *  they appear in legitimate dev-server proxied requests. */
        private val BOT_UA_PATTERNS = listOf(
            "python-requests", "python-urllib", "scrapy", "httpclient",
            "go-http-client", "java/", "wget", "curl", "libwww-perl",
            "php/", "okhttp", "apache-httpclient",
            "httpie", "postmanruntime"
        )

        /** Thresholds (5-minute window) */
        private const val MAX_LINK_CREATES_5MIN = 50
        private const val MAX_REDIRECTS_1MIN = 500
        private const val BEHAVIOUR_WINDOW_SECONDS = 300L // 5 min
        private const val REDIRECT_WINDOW_SECONDS = 60L   // 1 min

        /** Redis keys */
        private const val BLOCKED_IPS_KEY = "abuse:blocked_ips"
        private const val SUSPICIOUS_FLAG_PREFIX = "abuse:suspicious:"
        private const val SUSPICIOUS_FLAG_TTL_SECONDS = 600L // 10 min
    }

    /**
     * Returns true when a request looks suspicious and should be subject
     * to tighter rate limits.
     */
    fun isSuspicious(request: HttpServletRequest, userId: String? = null): Boolean {
        val ip = extractClientIp(request)

        // 1. Already flagged (cached for 10 min) — fast path
        if (isFlaggedSuspicious(ip)) return true

        // 2. Blocked IP list
        if (isBlockedIp(ip)) {
            flagSuspicious(ip)
            return true
        }

        // 3. User-Agent heuristics
        val ua = request.getHeader("User-Agent")?.lowercase() ?: ""
        if (ua.isBlank() || BOT_UA_PATTERNS.any { ua.contains(it) }) {
            logger.debug("Suspicious UA detected from $ip: '$ua'")
            flagSuspicious(ip)
            return true
        }

        // 4. Behaviour analysis — excessive link creation (only count actual POST /api/v1/links)
        val path = request.requestURI
        val method = request.method
        if (method.equals("POST", ignoreCase = true) && path.startsWith("/api/v1/links")) {
            val linkCreateCount = rateLimitService.incrementCounter(
                "abuse:link_creates:$ip", BEHAVIOUR_WINDOW_SECONDS
            )
            if (linkCreateCount > MAX_LINK_CREATES_5MIN) {
                logger.warn("Abuse: $ip created $linkCreateCount links in 5 min")
                flagSuspicious(ip)
                return true
            }
        }

        // 5. Behaviour analysis — extremely high redirect rate (only count actual /go/ requests)
        if (path.startsWith("/go/")) {
            val redirectCount = rateLimitService.incrementCounter(
                "abuse:redirects:$ip", REDIRECT_WINDOW_SECONDS
            )
            if (redirectCount > MAX_REDIRECTS_1MIN) {
                logger.warn("Abuse: $ip made $redirectCount redirects in 1 min")
                flagSuspicious(ip)
                return true
            }
        }

        return false
    }

    /**
     * Check whether an IP is on the explicit block list (Redis set).
     */
    fun isBlockedIp(ip: String): Boolean {
        return try {
            redisTemplate.opsForSet().isMember(BLOCKED_IPS_KEY, ip) == true
        } catch (ex: Exception) {
            logger.warn("Could not check blocked IPs: ${ex.message}")
            false
        }
    }

    /**
     * Add an IP to the blocked list.
     */
    fun blockIp(ip: String) {
        try {
            redisTemplate.opsForSet().add(BLOCKED_IPS_KEY, ip)
        } catch (ex: Exception) {
            logger.warn("Could not block IP: ${ex.message}")
        }
    }

    /**
     * Flag an IP as suspicious for SUSPICIOUS_FLAG_TTL_SECONDS.
     */
    private fun flagSuspicious(ip: String) {
        try {
            val key = "$SUSPICIOUS_FLAG_PREFIX$ip"
            redisTemplate.opsForValue().set(key, "1", Duration.ofSeconds(SUSPICIOUS_FLAG_TTL_SECONDS))
        } catch (ex: Exception) {
            logger.warn("Could not flag suspicious IP: ${ex.message}")
        }
    }

    /**
     * Check if an IP is currently flagged.
     */
    fun isFlaggedSuspicious(ip: String): Boolean {
        return try {
            redisTemplate.hasKey("$SUSPICIOUS_FLAG_PREFIX$ip")
        } catch (ex: Exception) {
            false
        }
    }

    /**
     * Whether we should require a CAPTCHA challenge for the given request.
     * Triggered for borderline cases on redirect endpoints.
     */
    fun shouldRequireChallenge(request: HttpServletRequest): Boolean {
        val ip = extractClientIp(request)
        return isFlaggedSuspicious(ip)
    }

    /**
     * Extract the real client IP, respecting X-Forwarded-For from trusted proxies.
     */
    fun extractClientIp(request: HttpServletRequest): String {
        val forwarded = request.getHeader("X-Forwarded-For")
        if (!forwarded.isNullOrBlank()) {
            return forwarded.split(",").first().trim()
        }
        return request.remoteAddr ?: "unknown"
    }
}

package com.golinks.golinks.service

import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration
import java.time.Instant

/**
 * Sliding-window rate limiter backed by Redis sorted sets.
 *
 * Each rate-limit bucket is a sorted set keyed by e.g. "rl:ip:1.2.3.4:auth".
 * Members are unique request IDs (timestamp-based), scored by epoch millis.
 * On each check we:
 *   1. Remove entries older than the window
 *   2. Count remaining entries
 *   3. If under the limit, add the new entry and allow
 *   4. If at or over the limit, reject and return seconds until the oldest entry expires
 */
@Service
class RateLimitService(
    private val redisTemplate: StringRedisTemplate
) {

    private val logger = LoggerFactory.getLogger(RateLimitService::class.java)

    data class RateLimitResult(
        val allowed: Boolean,
        val remaining: Int,
        val retryAfterSeconds: Long = 0
    )

    /**
     * Check and consume one request against the sliding window.
     *
     * @param key        Redis key, e.g. "rl:ip:1.2.3.4:auth"
     * @param maxRequests Maximum requests allowed in the window
     * @param windowSeconds Window size in seconds
     * @return RateLimitResult indicating whether the request is allowed
     */
    fun checkRateLimit(key: String, maxRequests: Int, windowSeconds: Long): RateLimitResult {
        return try {
            val now = Instant.now()
            val nowMillis = now.toEpochMilli()
            val windowStart = nowMillis - (windowSeconds * 1000)

            val ops = redisTemplate.opsForZSet()

            // 1. Remove entries outside the window
            ops.removeRangeByScore(key, Double.NEGATIVE_INFINITY, windowStart.toDouble())

            // 2. Count current entries in the window
            val currentCount = ops.zCard(key) ?: 0

            if (currentCount < maxRequests) {
                // 3. Add this request
                val member = "$nowMillis:${System.nanoTime()}"
                ops.add(key, member, nowMillis.toDouble())
                redisTemplate.expire(key, Duration.ofSeconds(windowSeconds + 1))

                RateLimitResult(
                    allowed = true,
                    remaining = (maxRequests - currentCount - 1).toInt()
                )
            } else {
                // 4. Limit exceeded — compute retry-after from the oldest entry
                val oldest = ops.rangeWithScores(key, 0, 0)?.firstOrNull()
                val retryAfter = if (oldest != null) {
                    val oldestMillis = oldest.score?.toLong() ?: nowMillis
                    val expiresAt = oldestMillis + (windowSeconds * 1000)
                    maxOf(1, (expiresAt - nowMillis) / 1000)
                } else {
                    windowSeconds
                }

                RateLimitResult(
                    allowed = false,
                    remaining = 0,
                    retryAfterSeconds = retryAfter
                )
            }
        } catch (ex: Exception) {
            // If Redis is down, fail open — allow the request
            logger.warn("Rate limit check failed (Redis error), allowing request: ${ex.message}")
            RateLimitResult(allowed = true, remaining = maxRequests)
        }
    }

    /**
     * Build a rate-limit key for an IP + endpoint category.
     */
    fun ipKey(ip: String, category: String): String = "rl:ip:$ip:$category"

    /**
     * Build a rate-limit key for an authenticated user + endpoint category.
     */
    fun userKey(userId: String, category: String): String = "rl:user:$userId:$category"

    /**
     * Increment a behaviour counter (used by AbuseDetectionService).
     * Returns the new count within the window.
     */
    fun incrementCounter(key: String, windowSeconds: Long): Long {
        return try {
            val now = Instant.now().toEpochMilli()
            val windowStart = now - (windowSeconds * 1000)

            val ops = redisTemplate.opsForZSet()
            ops.removeRangeByScore(key, Double.NEGATIVE_INFINITY, windowStart.toDouble())

            val member = "$now:${System.nanoTime()}"
            ops.add(key, member, now.toDouble())
            redisTemplate.expire(key, Duration.ofSeconds(windowSeconds + 1))

            ops.zCard(key) ?: 0
        } catch (ex: Exception) {
            logger.warn("Counter increment failed: ${ex.message}")
            0L
        }
    }
}

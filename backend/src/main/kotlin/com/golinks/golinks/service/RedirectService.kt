package com.golinks.golinks.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.golinks.golinks.config.RabbitConfig
import com.golinks.golinks.entity.ShortUrl
import com.golinks.golinks.exception.*
import com.golinks.golinks.messaging.ClickEvent
import com.golinks.golinks.repository.ShortUrlRepository
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant

data class CachedSlugMeta(
    val destinationUrl: String = "",
    val hasConstraints: Boolean = false
)

@Service
class RedirectService(
    private val shortUrlRepository: ShortUrlRepository,
    private val redisTemplate: StringRedisTemplate,
    private val passwordEncoder: PasswordEncoder,
    private val rabbitTemplate: RabbitTemplate,
    private val objectMapper: ObjectMapper,
    private val clickIngestionService: ClickIngestionService,
    @Value("\${app.analytics.click-tracking-mode:sync}")
    private val clickTrackingMode: String
) {

    private val logger = LoggerFactory.getLogger(RedirectService::class.java)

    companion object {
        private const val CACHE_PREFIX = "slug:"
        private const val META_PREFIX = "slug_meta:"
        private val CACHE_TTL = Duration.ofHours(24)
    }

    /**
     * Fast-path: retrieve cached slug metadata from Redis.
     * Returns null on cache miss or Redis failure (gracefully degrades to DB).
     */
    fun getCachedSlugMeta(slug: String): CachedSlugMeta? {
        return try {
            val json = redisTemplate.opsForValue().get("$META_PREFIX$slug") ?: return null
            objectMapper.readValue(json, CachedSlugMeta::class.java)
        } catch (ex: Exception) {
            logger.warn("Redis meta cache read failed for slug=$slug: ${ex.message}")
            null
        }
    }

    /**
     * Write-back: cache slug metadata into Redis after a DB lookup
     * so future requests can take the fast path.
     */
    fun cacheSlugMeta(slug: String, destinationUrl: String, hasConstraints: Boolean) {
        try {
            val meta = CachedSlugMeta(destinationUrl, hasConstraints)
            val json = objectMapper.writeValueAsString(meta)
            redisTemplate.opsForValue().set("$META_PREFIX$slug", json, CACHE_TTL)
        } catch (ex: Exception) {
            logger.warn("Failed to cache slug meta=$slug: ${ex.message}")
        }
    }

    /**
     * Resolve a slug to its ShortUrl entity, performing all access checks.
     * Returns the ShortUrl if accessible (for non-password-protected links).
     */
    @Transactional(readOnly = true)
    fun resolveSlug(slug: String): ShortUrl {
        val shortUrl = shortUrlRepository.findBySlugAndDeletedFalse(slug)
            ?: throw LinkNotFoundException()

        if (!shortUrl.isActive) {
            throw LinkNotFoundException("This link is no longer active")
        }
        if (shortUrl.isExpired) {
            throw LinkExpiredException()
        }
        if (shortUrl.isMaxClicksReached) {
            throw LinkExpiredException("This link has reached its maximum click limit")
        }

        return shortUrl
    }

    /**
     * Get the redirect destination for a normal (non-protected) slug.
     * Tries Redis cache first, then DB.
     */
    fun getRedirectUrl(slug: String): String? {
        // Try cache first
        try {
            val cached = redisTemplate.opsForValue().get("$CACHE_PREFIX$slug")
            if (cached != null) return cached
        } catch (ex: Exception) {
            logger.warn("Redis cache read failed for slug=$slug: ${ex.message}")
        }
        return null
    }

    /**
     * Verify the password for a password-protected link.
     */
    fun verifyPassword(shortUrl: ShortUrl, password: String): Boolean {
        return shortUrl.passwordHash != null && passwordEncoder.matches(password, shortUrl.passwordHash)
    }

    /**
     * Consume a one-time link atomically.
     * Returns the destination URL if successful, throws if already consumed.
     */
    @Transactional
    fun consumeOneTimeLink(slug: String): String {
        val shortUrl = shortUrlRepository.findBySlugAndDeletedFalse(slug)
            ?: throw LinkNotFoundException()

        val updated = shortUrlRepository.atomicConsumeOneTimeLink(slug, Instant.now())
        if (updated == 0) {
            throw LinkConsumedException()
        }

        // Evict from cache
        try {
            redisTemplate.delete("$META_PREFIX$slug")
            redisTemplate.delete("$CACHE_PREFIX$slug")
        } catch (ex: Exception) {
            logger.warn("Failed to evict cached one-time link: ${ex.message}")
        }

        return shortUrl.destinationUrl
    }

    /**
     * Record a click using the configured mode:
     * - sync (default): write directly to DB
     * - async: publish to RabbitMQ, fallback to direct write on publish failure
     * - hybrid: direct write + best-effort publish
     */
    fun recordClick(slug: String, request: HttpServletRequest?) {
        val event = ClickEvent(
            slug = slug,
            timestamp = Instant.now(),
            ip = request?.let { extractClientIp(it) },
            userAgent = request?.getHeader("User-Agent"),
            referrer = request?.getHeader("Referer"),
            acceptLanguage = request?.getHeader("Accept-Language")
        )

        when (clickTrackingMode.lowercase()) {
            "async" -> publishAsyncWithFallback(event)
            "hybrid" -> {
                ingestSync(event)
                publishAsyncBestEffort(event)
            }
            else -> ingestSync(event)
        }
    }

    private fun publishAsyncWithFallback(event: ClickEvent) {
        try {
            rabbitTemplate.convertAndSend(RabbitConfig.LINK_CLICK_QUEUE, event)
        } catch (ex: Exception) {
            logger.warn("Failed to publish click event for slug={}: {}. Falling back to sync ingestion", event.slug, ex.message)
            ingestSync(event)
        }
    }

    private fun publishAsyncBestEffort(event: ClickEvent) {
        try {
            rabbitTemplate.convertAndSend(RabbitConfig.LINK_CLICK_QUEUE, event)
        } catch (ex: Exception) {
            logger.debug("Best-effort async publish skipped for slug={}: {}", event.slug, ex.message)
        }
    }

    private fun ingestSync(event: ClickEvent) {
        try {
            clickIngestionService.ingest(event)
        } catch (ex: Exception) {
            logger.warn("Synchronous click ingestion failed for slug={}: {}", event.slug, ex.message)
            // Last-resort fallback: preserve at least aggregate count.
            try {
                shortUrlRepository.incrementClickCount(event.slug)
            } catch (dbEx: Exception) {
                logger.error("Failed to increment click count for slug={}: {}", event.slug, dbEx.message)
            }
        }
    }

    /**
     * Cache a slug -> destinationUrl mapping.
     */
    fun cacheSlug(slug: String, destinationUrl: String) {
        try {
            redisTemplate.opsForValue().set("$CACHE_PREFIX$slug", destinationUrl, CACHE_TTL)
        } catch (ex: Exception) {
            logger.warn("Failed to cache slug=$slug: ${ex.message}")
        }
    }

    private fun extractClientIp(request: HttpServletRequest): String {
        val forwarded = request.getHeader("X-Forwarded-For")
        return if (!forwarded.isNullOrBlank()) {
            forwarded.split(",").first().trim()
        } else {
            request.remoteAddr
        }
    }
}

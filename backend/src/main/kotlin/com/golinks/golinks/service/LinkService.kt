package com.golinks.golinks.service

import com.aventrix.jnanoid.jnanoid.NanoIdUtils
import com.golinks.golinks.dto.*
import com.golinks.golinks.entity.ShortUrl
import com.golinks.golinks.entity.Tag
import com.golinks.golinks.exception.DuplicateSlugException
import com.golinks.golinks.exception.LinkNotFoundException
import com.golinks.golinks.exception.MaliciousUrlException
import com.golinks.golinks.exception.UserNotFoundException
import com.golinks.golinks.repository.ShortUrlRepository
import com.golinks.golinks.repository.TagRepository
import com.golinks.golinks.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.*

@Service
class LinkService(
    private val shortUrlRepository: ShortUrlRepository,
    private val userRepository: UserRepository,
    private val tagRepository: TagRepository,
    private val auditService: AuditService,
    private val passwordEncoder: PasswordEncoder,
    private val redisTemplate: StringRedisTemplate
) {

    private val logger = LoggerFactory.getLogger(LinkService::class.java)

    companion object {
        private const val SLUG_LENGTH = 7
        private const val MAX_SLUG_ATTEMPTS = 5
        private val SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray()
        private const val CACHE_PREFIX = "slug:"
        private val CACHE_TTL = Duration.ofHours(24)
        private val MALICIOUS_PATTERNS = listOf(
            "phishing", "malware", "spam", "data:", "javascript:", "vbscript:"
        )
        private val BLOCKED_DOMAINS = listOf(
            "bit.ly", "tinyurl.com", "is.gd" // prevent redirect chains
        )
    }

    @Transactional
    fun createLink(userId: UUID, request: CreateLinkRequest): LinkResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        val sanitizedUrl = sanitizeUrl(request.destinationUrl)
        validateUrlSafety(sanitizedUrl)

        val slug = if (!request.slug.isNullOrBlank()) {
            if (shortUrlRepository.existsBySlug(request.slug.trim())) {
                throw DuplicateSlugException()
            }
            request.slug.trim()
        } else {
            generateSlug()
        }

        val tags = resolveTags(userId, request.tags, user)

        val shortUrl = ShortUrl(
            user = user,
            slug = slug,
            destinationUrl = sanitizedUrl,
            title = request.title?.trim(),
            tags = tags.toMutableSet(),
            passwordHash = request.password?.let { passwordEncoder.encode(it) },
            isPrivate = request.isPrivate ?: false,
            isOneTime = request.isOneTime ?: false,
            expiresAt = request.expiresAt?.let { raw ->
                try {
                    Instant.parse(raw)
                } catch (ex: java.time.format.DateTimeParseException) {
                    throw IllegalArgumentException("Invalid expiration date format. Use ISO-8601 (e.g. 2026-12-31T23:59:59Z)")
                }
            },
            maxClicks = request.maxClicks
        )

        val saved = shortUrlRepository.save(shortUrl)

        // Cache warm-up: store slug -> destination in Redis
        try {
            redisTemplate.opsForValue().set(
                "$CACHE_PREFIX${saved.slug}",
                saved.destinationUrl,
                CACHE_TTL
            )
        } catch (ex: Exception) {
            logger.warn("Failed to warm Redis cache for slug=${saved.slug}: ${ex.message}")
        }

        // Audit log
        auditService.record(
            userId = userId,
            action = "LINK_CREATED",
            resourceType = "LINK",
            shortUrlId = saved.id,
            details = mapOf("slug" to saved.slug, "destinationUrl" to saved.destinationUrl)
        )

        logger.info("Link created: slug=${saved.slug}, userId=$userId")
        return toResponse(saved)
    }

    @Transactional
    fun updateLink(userId: UUID, linkId: UUID, request: UpdateLinkRequest): LinkResponse {
        val shortUrl = shortUrlRepository.findByIdAndUserIdAndDeletedFalse(linkId, userId)
            ?: throw LinkNotFoundException()

        request.destinationUrl?.let {
            val sanitized = sanitizeUrl(it)
            validateUrlSafety(sanitized)
            shortUrl.destinationUrl = sanitized
        }
        request.title?.let { shortUrl.title = it.trim() }
        request.isActive?.let { shortUrl.isActive = it }
        request.slug?.let { newSlug ->
            if (newSlug.trim() != shortUrl.slug && shortUrlRepository.existsBySlug(newSlug.trim())) {
                throw DuplicateSlugException()
            }
            // Evict old slug from cache
            evictCache(shortUrl.slug)
            shortUrl.slug = newSlug.trim()
        }
        request.password?.let { shortUrl.passwordHash = passwordEncoder.encode(it) }
        if (request.removePassword == true) { shortUrl.passwordHash = null }
        request.isPrivate?.let { shortUrl.isPrivate = it }
        request.isOneTime?.let { shortUrl.isOneTime = it }
        request.expiresAt?.let { raw ->
            shortUrl.expiresAt = if (raw.isBlank()) null else try {
                Instant.parse(raw)
            } catch (ex: java.time.format.DateTimeParseException) {
                throw IllegalArgumentException("Invalid expiration date format. Use ISO-8601 (e.g. 2026-12-31T23:59:59Z)")
            }
        }
        request.maxClicks?.let { shortUrl.maxClicks = it }

        request.tags?.let { tagNames ->
            val user = shortUrl.user
            val tags = resolveTags(userId, tagNames, user)
            shortUrl.tags.clear()
            shortUrl.tags.addAll(tags)
        }

        val saved = shortUrlRepository.save(shortUrl)

        // Update cache
        try {
            redisTemplate.opsForValue().set(
                "$CACHE_PREFIX${saved.slug}",
                saved.destinationUrl,
                CACHE_TTL
            )
        } catch (ex: Exception) {
            logger.warn("Failed to update Redis cache for slug=${saved.slug}: ${ex.message}")
        }

        auditService.record(
            userId = userId,
            action = "LINK_UPDATED",
            resourceType = "LINK",
            shortUrlId = saved.id,
            details = mapOf("slug" to saved.slug)
        )

        logger.info("Link updated: id=$linkId, userId=$userId")
        return toResponse(saved)
    }

    @Transactional
    fun softDeleteLink(userId: UUID, linkId: UUID) {
        val shortUrl = shortUrlRepository.findByIdAndUserIdAndDeletedFalse(linkId, userId)
            ?: throw LinkNotFoundException()

        shortUrl.deleted = true
        shortUrl.deletedAt = Instant.now()
        shortUrlRepository.save(shortUrl)

        evictCache(shortUrl.slug)

        auditService.record(
            userId = userId,
            action = "LINK_DELETED",
            resourceType = "LINK",
            shortUrlId = shortUrl.id,
            details = mapOf("slug" to shortUrl.slug)
        )

        logger.info("Link soft-deleted: id=$linkId, userId=$userId")
    }

    @Transactional
    fun bulkSoftDelete(userId: UUID, ids: List<UUID>): BulkOperationResponse {
        if (ids.isEmpty()) {
            return BulkOperationResponse(successCount = 0, message = "No links specified")
        }

        val count = shortUrlRepository.bulkSoftDelete(ids, userId, Instant.now())

        // Audit each
        ids.forEach { id ->
            auditService.record(
                userId = userId,
                action = "LINK_BULK_DELETED",
                resourceType = "LINK",
                shortUrlId = id
            )
        }

        logger.info("Bulk soft-deleted $count links for userId=$userId")
        return BulkOperationResponse(
            successCount = count,
            message = "$count link(s) deleted successfully"
        )
    }

    @Transactional(readOnly = true)
    fun getLinks(
        userId: UUID,
        search: String?,
        cursor: String?,
        page: Int,
        limit: Int
    ): PaginatedLinksResponse {
        val pageSize = limit.coerceIn(1, 100)
        val safePage = page.coerceAtLeast(0)
        val pageable = if (cursor != null) {
            PageRequest.of(0, pageSize)
        } else {
            PageRequest.of(safePage, pageSize)
        }

        val totalCount: Long
        val items: List<ShortUrl>

        if (!search.isNullOrBlank()) {
            totalCount = shortUrlRepository.countSearchByUser(userId, search.trim())
            items = shortUrlRepository.searchByUser(userId, search.trim(), pageable)
        } else if (cursor != null) {
            val cursorInstant = decodeCursor(cursor)
            totalCount = shortUrlRepository.countByUserIdAndDeletedFalse(userId)
            items = shortUrlRepository.findByUserWithCursor(userId, cursorInstant, pageable)
        } else {
            totalCount = shortUrlRepository.countByUserIdAndDeletedFalse(userId)
            items = shortUrlRepository.findByUserNoCursor(userId, pageable)
        }

        val nextCursor = if (items.size == pageSize) {
            encodeCursor(items.last().createdAt)
        } else {
            null
        }

        val totalPages = if (totalCount == 0L) {
            0
        } else {
            ((totalCount + pageSize - 1) / pageSize).toInt()
        }

        val responsePage = if (cursor != null) 0 else safePage

        return PaginatedLinksResponse(
            items = items.map { toResponse(it) },
            nextCursor = nextCursor,
            totalCount = totalCount,
            hasMore = nextCursor != null,
            page = responsePage,
            pageSize = pageSize,
            totalPages = totalPages
        )
    }

    @Transactional(readOnly = true)
    fun getLinkById(userId: UUID, linkId: UUID): LinkResponse {
        val shortUrl = shortUrlRepository.findByIdAndUserIdAndDeletedFalse(linkId, userId)
            ?: throw LinkNotFoundException()
        return toResponse(shortUrl)
    }

    @Transactional(readOnly = true)
    fun getStats(userId: UUID): LinkStatsResponse {
        return LinkStatsResponse(
            totalLinks = shortUrlRepository.countByUserIdAndDeletedFalse(userId),
            totalClicks = shortUrlRepository.sumClicksByUserId(userId),
            activeLinks = shortUrlRepository.countByUserIdAndDeletedFalseAndIsActiveTrue(userId)
        )
    }

    fun checkSlugAvailability(slug: String): SlugCheckResponse {
        val available = !shortUrlRepository.existsBySlug(slug.trim())
        val suggestions = if (!available) {
            (1..3).map { "${slug.trim()}-${generateShortSuffix()}" }
        } else {
            emptyList()
        }
        return SlugCheckResponse(available = available, suggestions = suggestions)
    }

    @Transactional(readOnly = true)
    fun getUserTags(userId: UUID): List<TagResponse> {
        return tagRepository.findAllByUserId(userId).map {
            TagResponse(id = it.id!!, name = it.name)
        }
    }

    // ── URL Helpers ──────────────────────────────────────────

    fun sanitizeUrl(url: String): String {
        var sanitized = url.trim()
        if (!sanitized.matches(Regex("^https?://.*", RegexOption.IGNORE_CASE))) {
            sanitized = "https://$sanitized"
        }
        return sanitized
    }

    fun validateUrlSafety(url: String) {
        val lower = url.lowercase()
        for (pattern in MALICIOUS_PATTERNS) {
            if (lower.contains(pattern)) {
                throw MaliciousUrlException("URL contains blocked pattern: $pattern")
            }
        }
        for (domain in BLOCKED_DOMAINS) {
            if (lower.contains(domain)) {
                throw MaliciousUrlException("URL shortener redirect chains are not allowed")
            }
        }
        // Block pure-IP URLs (e.g., http://192.168.1.1)
        if (lower.matches(Regex("^https?://\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}.*"))) {
            throw MaliciousUrlException("IP-based URLs are not allowed")
        }
    }

    // ── Slug Generation ──────────────────────────────────────

    private fun generateSlug(): String {
        repeat(MAX_SLUG_ATTEMPTS) {
            val slug = NanoIdUtils.randomNanoId(Random(), SLUG_ALPHABET, SLUG_LENGTH)
            if (!shortUrlRepository.existsBySlug(slug)) {
                return slug
            }
        }
        // Fallback: longer slug
        return NanoIdUtils.randomNanoId(Random(), SLUG_ALPHABET, SLUG_LENGTH + 4)
    }

    private fun generateShortSuffix(): String {
        return NanoIdUtils.randomNanoId(Random(), SLUG_ALPHABET, 3)
    }

    // ── Tag Resolution ───────────────────────────────────────

    private fun resolveTags(userId: UUID, tagNames: List<String>?, user: com.golinks.golinks.entity.User): List<Tag> {
        if (tagNames.isNullOrEmpty()) return emptyList()

        val normalized = tagNames.map { it.trim().lowercase() }.filter { it.isNotBlank() }.distinct()
        val existing = tagRepository.findByNameInAndUserId(normalized, userId)
        val existingNames = existing.map { it.name }.toSet()
        val newTags = normalized.filter { it !in existingNames }.map { name ->
            tagRepository.save(Tag(name = name, user = user))
        }
        return existing + newTags
    }

    // ── Cache ────────────────────────────────────────────────

    private fun evictCache(slug: String) {
        try {
            redisTemplate.delete("$CACHE_PREFIX$slug")
        } catch (ex: Exception) {
            logger.warn("Failed to evict Redis cache for slug=$slug: ${ex.message}")
        }
    }

    // ── Mapping ──────────────────────────────────────────────

    fun toResponse(shortUrl: ShortUrl): LinkResponse {
        return LinkResponse(
            id = shortUrl.id!!,
            slug = shortUrl.slug,
            destinationUrl = shortUrl.destinationUrl,
            title = shortUrl.title,
            tags = shortUrl.tags.map { TagResponse(id = it.id!!, name = it.name) },
            clicksCount = shortUrl.clicksCount,
            isActive = shortUrl.isActive,
            isPasswordProtected = shortUrl.isPasswordProtected,
            isPrivate = shortUrl.isPrivate,
            isOneTime = shortUrl.isOneTime,
            expiresAt = shortUrl.expiresAt,
            maxClicks = shortUrl.maxClicks,
            createdAt = shortUrl.createdAt,
            updatedAt = shortUrl.updatedAt,
            shortUrl = "go/${shortUrl.slug}"
        )
    }

    private fun encodeCursor(instant: Instant): String {
        return Base64.getEncoder().encodeToString(instant.toString().toByteArray())
    }

    private fun decodeCursor(cursor: String): Instant {
        val decoded = String(Base64.getDecoder().decode(cursor))
        return Instant.parse(decoded)
    }
}

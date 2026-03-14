package com.golinks.golinks.service

import com.golinks.golinks.dto.AnalyticsSummaryResponse
import com.golinks.golinks.dto.DailyClicksResponse
import com.golinks.golinks.dto.HeatmapAvailabilityResponse
import com.golinks.golinks.dto.HeatmapBucketTotalResponse
import com.golinks.golinks.dto.HeatmapPointResponse
import com.golinks.golinks.dto.HeatmapResponse
import com.golinks.golinks.dto.PaginatedSessionsResponse
import com.golinks.golinks.dto.ReferrerResponse
import com.golinks.golinks.dto.SessionEventResponse
import com.golinks.golinks.dto.SessionEventsResponse
import com.golinks.golinks.dto.SessionSummaryResponse
import com.golinks.golinks.dto.TimeSeriesResponse
import com.golinks.golinks.dto.TopLinkResponse
import com.golinks.golinks.exception.SessionNotFoundException
import com.golinks.golinks.repository.AnalyticsHeatmapHourlyRepository
import com.golinks.golinks.repository.AnalyticsSessionSummaryRepository
import com.golinks.golinks.repository.ClickEventRepository
import com.golinks.golinks.repository.ShortUrlRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class AnalyticsService(
    private val clickEventRepository: ClickEventRepository,
    private val shortUrlRepository: ShortUrlRepository,
    private val heatmapRepository: AnalyticsHeatmapHourlyRepository,
    private val sessionSummaryRepository: AnalyticsSessionSummaryRepository,
    private val analyticsAggregationService: AnalyticsAggregationService,
    @Value("\${app.analytics.privacy-min-bucket-size:3}")
    private val privacyMinBucketSize: Long
) {

    private val logger = LoggerFactory.getLogger(AnalyticsService::class.java)

    private fun getUserSlugs(userId: UUID): List<String> {
        return shortUrlRepository.findAllSlugsByUserId(userId)
    }

    @Transactional(readOnly = true)
    fun getSummary(userId: UUID, from: Instant, to: Instant): AnalyticsSummaryResponse {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) {
            return AnalyticsSummaryResponse(
                totalClicks = 0,
                uniqueVisitors = 0,
                topLinkSlug = null,
                topLinkTitle = null,
                avgClicksPerDay = 0.0,
                periodFrom = from,
                periodTo = to
            )
        }

        val totalClicks = clickEventRepository.countBySlugInAndCreatedAtBetween(slugs, from, to)
        val uniqueVisitors = clickEventRepository.countDistinctIpBySlugIn(slugs, from, to)

        val topLinks = clickEventRepository.findTopLinks(slugs, from, to, 1)
        val topLink = topLinks.firstOrNull()

        val days = Duration.between(from, to).toDays().coerceAtLeast(1)
        val avgClicksPerDay = totalClicks.toDouble() / days

        return AnalyticsSummaryResponse(
            totalClicks = totalClicks,
            uniqueVisitors = uniqueVisitors,
            topLinkSlug = topLink?.getSlug(),
            topLinkTitle = topLink?.getTitle(),
            avgClicksPerDay = Math.round(avgClicksPerDay * 100.0) / 100.0,
            periodFrom = from,
            periodTo = to
        )
    }

    @Transactional(readOnly = true)
    fun getTimeSeries(userId: UUID, from: Instant, to: Instant): TimeSeriesResponse {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) {
            return TimeSeriesResponse(data = emptyList())
        }

        val dailyClicks = clickEventRepository.findClicksPerDay(slugs, from, to)
        val data = dailyClicks.map { DailyClicksResponse(date = it.getDate(), clicks = it.getClicks()) }

        return TimeSeriesResponse(data = data)
    }

    @Transactional(readOnly = true)
    fun getTopReferrers(userId: UUID, from: Instant, to: Instant, limit: Int): List<ReferrerResponse> {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) return emptyList()

        return clickEventRepository.findTopReferrers(slugs, from, to, limit).map {
            ReferrerResponse(referrer = it.getReferrer(), count = it.getCount())
        }
    }

    @Transactional(readOnly = true)
    fun getTopLinks(userId: UUID, from: Instant, to: Instant, limit: Int): List<TopLinkResponse> {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) return emptyList()

        return clickEventRepository.findTopLinks(slugs, from, to, limit).map {
            TopLinkResponse(slug = it.getSlug(), title = it.getTitle(), clicks = it.getClicks())
        }
    }

    @Transactional
    fun getHeatmapAvailability(userId: UUID, from: Instant, to: Instant): HeatmapAvailabilityResponse {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) {
            return HeatmapAvailabilityResponse(
                ready = false,
                dimensions = emptyList(),
                earliestBucket = null,
                latestBucket = null,
                updatedAt = null,
                periodFrom = from,
                periodTo = to
            )
        }

        maybeRefreshHeatmaps(userId, from)
        val availability = heatmapRepository.findAvailability(userId)
        val dimensions = heatmapRepository.findDistinctDimensions(userId).map { it.lowercase() }

        return HeatmapAvailabilityResponse(
            ready = availability?.getLatestBucket() != null && dimensions.isNotEmpty(),
            dimensions = dimensions,
            earliestBucket = availability?.getEarliestBucket(),
            latestBucket = availability?.getLatestBucket(),
            updatedAt = availability?.getUpdatedAt(),
            periodFrom = from,
            periodTo = to
        )
    }

    @Transactional
    fun getHeatmap(
        userId: UUID,
        dimension: String,
        from: Instant,
        to: Instant,
        slug: String?,
        limit: Int
    ): HeatmapResponse {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) {
            return HeatmapResponse(
                dimension = normalizeDimension(dimension).lowercase(),
                data = emptyList(),
                totals = emptyList(),
                periodFrom = from,
                periodTo = to,
                updatedAt = null
            )
        }

        val normalizedDimension = normalizeDimension(dimension)
        val safeLimit = limit.coerceIn(1, 100)
        val safeSlug = slug?.trim().orEmpty()

        maybeRefreshHeatmaps(userId, from)

        val pointsRaw = heatmapRepository.findHeatmapPoints(userId, normalizedDimension, from, to, safeSlug)
        val totalsRaw = heatmapRepository.findHeatmapTotals(userId, normalizedDimension, from, to, safeSlug, safeLimit)

        val visibleTotals = mutableListOf<HeatmapBucketTotalResponse>()
        var suppressedClicks = 0L
        val allowedKeys = mutableSetOf<String>()

        totalsRaw.forEach { row ->
            val key = normalizeBucketValue(row.getBucketKey())
            val clicks = row.getClicks()
            if (clicks < privacyMinBucketSize) {
                suppressedClicks += clicks
            } else {
                visibleTotals += HeatmapBucketTotalResponse(key = key, clicks = clicks)
                allowedKeys += key
            }
        }

        if (suppressedClicks > 0) {
            visibleTotals += HeatmapBucketTotalResponse(key = "Suppressed", clicks = suppressedClicks)
        }

        val grouped = linkedMapOf<Pair<Instant, String>, Long>()
        pointsRaw.forEach { row ->
            val bucketStart = row.getBucketStart()
            val normalizedKey = normalizeBucketValue(row.getBucketKey())
            val key = if (allowedKeys.contains(normalizedKey)) normalizedKey else "Suppressed"
            val mapKey = bucketStart to key
            grouped[mapKey] = (grouped[mapKey] ?: 0L) + row.getClicks()
        }

        val points = grouped.entries
            .sortedBy { it.key.first }
            .map {
                HeatmapPointResponse(
                    bucketStart = it.key.first,
                    key = it.key.second,
                    clicks = it.value
                )
            }

        val availability = heatmapRepository.findAvailability(userId)
        return HeatmapResponse(
            dimension = normalizedDimension.lowercase(),
            data = points,
            totals = visibleTotals.sortedByDescending { it.clicks },
            periodFrom = from,
            periodTo = to,
            updatedAt = availability?.getUpdatedAt()
        )
    }

    @Transactional
    fun getSessions(userId: UUID, from: Instant, to: Instant, page: Int, limit: Int): PaginatedSessionsResponse {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) {
            return PaginatedSessionsResponse(
                items = emptyList(),
                page = page,
                pageSize = limit,
                totalItems = 0,
                totalPages = 0,
                updatedAt = null
            )
        }

        maybeRefreshSessions(userId, from)

        val safePage = page.coerceAtLeast(0)
        val safeLimit = limit.coerceIn(1, 100)
        val pageable = PageRequest.of(safePage, safeLimit)
        val sessionPage = sessionSummaryRepository.findByOwnerAndRange(userId, from, to, pageable)

        val items = sessionPage.content.map {
            SessionSummaryResponse(
                id = it.id!!,
                visitorId = it.visitorId,
                startedAt = it.sessionStart,
                endedAt = it.sessionEnd,
                durationSeconds = it.durationSeconds,
                clicks = it.clicks,
                entrySlug = it.entrySlug,
                exitSlug = it.exitSlug,
                osName = it.osName,
                deviceType = it.deviceType,
                country = normalizeCountry(it.country)
            )
        }

        return PaginatedSessionsResponse(
            items = items,
            page = sessionPage.number,
            pageSize = sessionPage.size,
            totalItems = sessionPage.totalElements,
            totalPages = sessionPage.totalPages,
            updatedAt = sessionSummaryRepository.findLastUpdatedAtByOwnerUserId(userId)
        )
    }

    @Transactional(readOnly = true)
    fun getSessionEvents(userId: UUID, sessionId: UUID, page: Int, limit: Int): SessionEventsResponse {
        val session = sessionSummaryRepository.findByIdAndOwnerUserId(sessionId, userId)
            ?: throw SessionNotFoundException()

        val safePage = page.coerceAtLeast(0)
        val safeLimit = limit.coerceIn(1, 200)
        val offset = safePage * safeLimit

        val events = clickEventRepository.findSessionEvents(
            ownerUserId = userId,
            visitorId = session.visitorId,
            fromDate = session.sessionStart,
            toDate = session.sessionEnd,
            lim = safeLimit,
            offsetRows = offset
        )

        val total = clickEventRepository.countSessionEvents(
            ownerUserId = userId,
            visitorId = session.visitorId,
            fromDate = session.sessionStart,
            toDate = session.sessionEnd
        )

        val totalPages = if (total == 0L) 0 else ((total + safeLimit - 1) / safeLimit).toInt()

        return SessionEventsResponse(
            sessionId = sessionId,
            items = events.map {
                SessionEventResponse(
                    slug = it.getSlug(),
                    clickedAt = it.getClickedAt(),
                    referrer = it.getReferrer()?.takeIf { value -> value.isNotBlank() } ?: "Direct",
                    country = normalizeCountry(it.getCountry()),
                    osName = it.getOsName(),
                    browserName = it.getBrowserName(),
                    deviceType = it.getDeviceType()
                )
            },
            page = safePage,
            pageSize = safeLimit,
            totalItems = total,
            totalPages = totalPages
        )
    }

    private fun maybeRefreshHeatmaps(userId: UUID, from: Instant) {
        try {
            val latestBucket = heatmapRepository.findAvailability(userId)?.getLatestBucket()
            val now = Instant.now()
            val expectedRecentBucket = now.minus(1, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS)
            if (latestBucket == null || latestBucket.isBefore(expectedRecentBucket)) {
                analyticsAggregationService.rebuildRange(from.minus(1, ChronoUnit.HOURS), now)
            }
        } catch (ex: Exception) {
            logger.warn("Failed to refresh heatmap aggregates: ${ex.message}")
        }
    }

    private fun maybeRefreshSessions(userId: UUID, from: Instant) {
        try {
            val latestUpdate = sessionSummaryRepository.findLastUpdatedAtByOwnerUserId(userId)
            val now = Instant.now()
            if (latestUpdate == null || latestUpdate.isBefore(now.minus(5, ChronoUnit.MINUTES))) {
                analyticsAggregationService.rebuildRange(from.minus(1, ChronoUnit.HOURS), now)
            }
        } catch (ex: Exception) {
            logger.warn("Failed to refresh session aggregates: ${ex.message}")
        }
    }

    private fun normalizeDimension(dimension: String): String {
        return when (dimension.trim().lowercase()) {
            "country" -> "COUNTRY"
            "os" -> "OS"
            "device" -> "DEVICE"
            else -> throw IllegalArgumentException("Invalid heatmap dimension. Use: country, os, or device")
        }
    }

    private fun normalizeCountry(country: String?): String {
        val normalized = country?.trim()
        return if (normalized.isNullOrBlank() || normalized.equals("ZZ", ignoreCase = true)) {
            "Unknown"
        } else {
            normalized
        }
    }

    private fun normalizeBucketValue(value: String?): String {
        val normalized = value?.trim()
        return if (normalized.isNullOrBlank() || normalized.equals("ZZ", ignoreCase = true)) {
            "Unknown"
        } else {
            normalized
        }
    }
}

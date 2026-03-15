package com.golinks.golinks.service

import com.golinks.golinks.dto.AnalyticsSummaryResponse
import com.golinks.golinks.dto.DailyClicksResponse
import com.golinks.golinks.dto.HeatmapAvailabilityResponse
import com.golinks.golinks.dto.HeatmapFilterOptionResponse
import com.golinks.golinks.dto.HeatmapFilterOptionsResponse
import com.golinks.golinks.dto.HeatmapBucketTotalResponse
import com.golinks.golinks.dto.HeatmapPointResponse
import com.golinks.golinks.dto.HeatmapResponse
import com.golinks.golinks.dto.LinkSparklinePointResponse
import com.golinks.golinks.dto.LinkSparklineSeriesResponse
import com.golinks.golinks.dto.LinkSparklinesResponse
import com.golinks.golinks.dto.PaginatedSessionsResponse
import com.golinks.golinks.dto.ReferrerResponse
import com.golinks.golinks.dto.SessionEventResponse
import com.golinks.golinks.dto.SessionEventsResponse
import com.golinks.golinks.dto.SessionSummaryResponse
import com.golinks.golinks.dto.TimeSeriesResponse
import com.golinks.golinks.dto.TopLinkResponse
import com.golinks.golinks.exception.SessionNotFoundException
import com.golinks.golinks.repository.AnalyticsHeatmapTileHourlyRepository
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
    private val heatmapTileRepository: AnalyticsHeatmapTileHourlyRepository,
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
                recommendedGranularity = resolveGranularity("auto", from, to, "standard"),
                notReadyReason = "No links found for this workspace",
                periodFrom = from,
                periodTo = to
            )
        }

        maybeRefreshHeatmaps(userId, from)
        val availability = heatmapTileRepository.findAvailability(userId)
        val latestBucket = availability?.getLatestBucket()
        val expectedBucket = minOf(Instant.now(), to)
            .minus(1, ChronoUnit.HOURS)
            .truncatedTo(ChronoUnit.HOURS)
        val ready = latestBucket != null && !latestBucket.isBefore(expectedBucket)
        val notReadyReason = if (ready) null else "Aggregates are still being prepared for this window"

        return HeatmapAvailabilityResponse(
            ready = ready,
            dimensions = listOf("country", "continent", "os", "device"),
            earliestBucket = availability?.getEarliestBucket(),
            latestBucket = latestBucket,
            updatedAt = availability?.getUpdatedAt(),
            recommendedGranularity = resolveGranularity("auto", from, to, "standard"),
            notReadyReason = notReadyReason,
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
        continent: String?,
        country: String?,
        os: String?,
        device: String?,
        granularity: String?,
        resolution: String?,
        limit: Int
    ): HeatmapResponse {
        val slugs = getUserSlugs(userId)
        val normalizedDimension = normalizeDimension(dimension)
        val normalizedResolution = normalizeResolution(resolution)
        val appliedGranularity = resolveGranularity(granularity, from, to, normalizedResolution)

        if (slugs.isEmpty()) {
            return HeatmapResponse(
                dimension = normalizedDimension.lowercase(),
                data = emptyList(),
                totals = emptyList(),
                periodFrom = from,
                periodTo = to,
                updatedAt = null,
                granularity = appliedGranularity,
                resolution = normalizedResolution.lowercase()
            )
        }

        val safeLimit = when (normalizedResolution) {
            "COMPACT" -> limit.coerceIn(1, 40)
            else -> limit.coerceIn(1, 100)
        }
        val safeSlug = slug?.trim().orEmpty()
        val safeCountry = normalizeCountryFilter(country)
        val safeContinent = normalizeContinentFilter(continent)
        val safeOs = normalizeTextFilter(os)
        val safeDevice = normalizeTextFilter(device)

        maybeRefreshHeatmaps(userId, from)

        val pointsRaw = heatmapTileRepository.findHeatmapPoints(
            userId = userId,
            dimension = normalizedDimension,
            fromDate = from,
            toDate = to,
            slug = safeSlug,
            country = safeCountry,
            continent = safeContinent,
            osName = safeOs,
            deviceType = safeDevice,
            granularity = appliedGranularity
        )
        val totalsRaw = heatmapTileRepository.findHeatmapTotals(
            userId = userId,
            dimension = normalizedDimension,
            fromDate = from,
            toDate = to,
            slug = safeSlug,
            country = safeCountry,
            continent = safeContinent,
            osName = safeOs,
            deviceType = safeDevice,
            lim = safeLimit
        )

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

        val availability = heatmapTileRepository.findAvailability(userId)
        return HeatmapResponse(
            dimension = normalizedDimension.lowercase(),
            data = points,
            totals = visibleTotals.sortedByDescending { it.clicks },
            periodFrom = from,
            periodTo = to,
            updatedAt = availability?.getUpdatedAt(),
            granularity = appliedGranularity,
            resolution = normalizedResolution.lowercase()
        )
    }

    @Transactional
    fun getHeatmapFilterOptions(
        userId: UUID,
        from: Instant,
        to: Instant,
        slug: String?,
        continent: String?,
        country: String?,
        os: String?,
        device: String?
    ): HeatmapFilterOptionsResponse {
        val slugs = getUserSlugs(userId)
        if (slugs.isEmpty()) {
            return HeatmapFilterOptionsResponse(
                continents = emptyList(),
                countries = emptyList(),
                os = emptyList(),
                devices = emptyList(),
                updatedAt = null
            )
        }

        maybeRefreshHeatmaps(userId, from)

        val safeSlug = slug?.trim().orEmpty()
        val safeCountry = normalizeCountryFilter(country)
        val safeContinent = normalizeContinentFilter(continent)
        val safeOs = normalizeTextFilter(os)
        val safeDevice = normalizeTextFilter(device)
        val optionLimit = 50

        val continents = heatmapTileRepository.findContinentOptions(
            userId = userId,
            fromDate = from,
            toDate = to,
            slug = safeSlug,
            country = safeCountry,
            osName = safeOs,
            deviceType = safeDevice,
            lim = optionLimit
        ).map {
            HeatmapFilterOptionResponse(
                key = normalizeContinentValue(it.getKey()),
                clicks = it.getClicks()
            )
        }

        val countries = heatmapTileRepository.findCountryOptions(
            userId = userId,
            fromDate = from,
            toDate = to,
            slug = safeSlug,
            continent = safeContinent,
            osName = safeOs,
            deviceType = safeDevice,
            lim = optionLimit
        ).map {
            HeatmapFilterOptionResponse(
                key = normalizeCountry(it.getKey()),
                clicks = it.getClicks()
            )
        }

        val osOptions = heatmapTileRepository.findOsOptions(
            userId = userId,
            fromDate = from,
            toDate = to,
            slug = safeSlug,
            country = safeCountry,
            continent = safeContinent,
            deviceType = safeDevice,
            lim = optionLimit
        ).map {
            HeatmapFilterOptionResponse(
                key = normalizeBucketValue(it.getKey()),
                clicks = it.getClicks()
            )
        }

        val deviceOptions = heatmapTileRepository.findDeviceOptions(
            userId = userId,
            fromDate = from,
            toDate = to,
            slug = safeSlug,
            country = safeCountry,
            continent = safeContinent,
            osName = safeOs,
            lim = optionLimit
        ).map {
            HeatmapFilterOptionResponse(
                key = normalizeBucketValue(it.getKey()),
                clicks = it.getClicks()
            )
        }

        return HeatmapFilterOptionsResponse(
            continents = continents,
            countries = countries,
            os = osOptions,
            devices = deviceOptions,
            updatedAt = heatmapTileRepository.findAvailability(userId)?.getUpdatedAt()
        )
    }

    @Transactional
    fun getLinkSparklines(
        userId: UUID,
        from: Instant,
        to: Instant,
        slugs: List<String>,
        granularity: String?
    ): LinkSparklinesResponse {
        val ownedSlugs = getUserSlugs(userId).toSet()
        val requestedSlugs = slugs
            .map { it.trim() }
            .filter { it.isNotBlank() && it in ownedSlugs }
            .distinct()
            .take(100)

        val appliedGranularity = resolveGranularity(granularity, from, to, "standard")
        if (requestedSlugs.isEmpty()) {
            return LinkSparklinesResponse(
                series = emptyList(),
                granularity = appliedGranularity,
                periodFrom = from,
                periodTo = to,
                updatedAt = heatmapTileRepository.findAvailability(userId)?.getUpdatedAt()
            )
        }

        maybeRefreshHeatmaps(userId, from)

        val rows = heatmapTileRepository.findLinkSparklines(
            userId = userId,
            fromDate = from,
            toDate = to,
            slugs = requestedSlugs,
            granularity = appliedGranularity
        )

        val grouped = rows.groupBy(
            keySelector = { it.getSlug() },
            valueTransform = { LinkSparklinePointResponse(bucketStart = it.getBucketStart(), clicks = it.getClicks()) }
        )

        val series = requestedSlugs.map { slugKey ->
            LinkSparklineSeriesResponse(
                slug = slugKey,
                points = grouped[slugKey].orEmpty().sortedBy { it.bucketStart }
            )
        }

        return LinkSparklinesResponse(
            series = series,
            granularity = appliedGranularity,
            periodFrom = from,
            periodTo = to,
            updatedAt = heatmapTileRepository.findAvailability(userId)?.getUpdatedAt()
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
            val latestBucket = heatmapTileRepository.findAvailability(userId)?.getLatestBucket()
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
            "continent" -> "CONTINENT"
            "os" -> "OS"
            "device" -> "DEVICE"
            else -> throw IllegalArgumentException("Invalid heatmap dimension. Use: country, continent, os, or device")
        }
    }

    private fun normalizeCountry(country: String?): String {
        val normalized = country?.trim()?.uppercase().orEmpty()
        return if (normalized.isBlank() || normalized == "ZZ") {
            "Unknown"
        } else {
            normalized
        }
    }

    private fun normalizeCountryFilter(country: String?): String {
        val normalized = country?.trim()?.uppercase().orEmpty()
        if (normalized.isBlank() || normalized == "ALL") return ""
        if (normalized == "UNKNOWN") return "ZZ"
        return if (normalized.length == 2 && normalized.all { it in 'A'..'Z' }) normalized else ""
    }

    private fun normalizeContinentValue(value: String?): String {
        val normalized = value?.trim().orEmpty()
        return if (normalized.isBlank()) "Unknown" else normalized
    }

    private fun normalizeContinentFilter(continent: String?): String {
        val normalized = continent?.trim().orEmpty()
        return when {
            normalized.isBlank() -> ""
            normalized.equals("all", ignoreCase = true) -> ""
            normalized.equals("unknown", ignoreCase = true) -> "Unknown"
            else -> normalizeContinentValue(normalized)
        }
    }

    private fun normalizeTextFilter(value: String?): String {
        val normalized = value?.trim().orEmpty()
        return if (normalized.isBlank() || normalized.equals("all", ignoreCase = true)) "" else normalized
    }

    private fun normalizeResolution(resolution: String?): String {
        return when (resolution?.trim()?.lowercase()) {
            "compact", "mobile" -> "COMPACT"
            else -> "STANDARD"
        }
    }

    private fun resolveGranularity(granularity: String?, from: Instant, to: Instant, resolution: String): String {
        val requested = granularity?.trim()?.lowercase() ?: "auto"
        val days = Duration.between(from, to).toDays().coerceAtLeast(1)

        return when (requested) {
            "hourly" -> if (days > 120) "daily" else "hourly"
            "daily" -> "daily"
            else -> {
                if (days >= 60 || (resolution == "COMPACT" && days >= 21)) {
                    "daily"
                } else {
                    "hourly"
                }
            }
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

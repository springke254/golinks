package com.golinks.golinks.service

import com.golinks.golinks.entity.AnalyticsHeatmapHourly
import com.golinks.golinks.entity.AnalyticsHeatmapTileHourly
import com.golinks.golinks.entity.AnalyticsSessionSummary
import com.golinks.golinks.repository.AnalyticsHeatmapHourlyRepository
import com.golinks.golinks.repository.AnalyticsHeatmapTileHourlyRepository
import com.golinks.golinks.repository.AnalyticsSessionSummaryRepository
import com.golinks.golinks.repository.ClickEventRepository
import com.golinks.golinks.repository.HeatmapRollupProjection
import com.golinks.golinks.repository.HeatmapTileRollupProjection
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@Service
class AnalyticsAggregationService(
    private val clickEventRepository: ClickEventRepository,
    private val heatmapRepository: AnalyticsHeatmapHourlyRepository,
    private val heatmapTileRepository: AnalyticsHeatmapTileHourlyRepository,
    private val sessionSummaryRepository: AnalyticsSessionSummaryRepository,
    @Value("\${app.analytics.rollup-enabled:true}")
    private val rollupEnabled: Boolean,
    @Value("\${app.analytics.session-timeout-minutes:30}")
    private val sessionTimeoutMinutes: Long
) {

    private val logger = LoggerFactory.getLogger(AnalyticsAggregationService::class.java)

    @Transactional
    fun rebuildRange(from: Instant, to: Instant) {
        if (!rollupEnabled) return
        if (!from.isBefore(to)) return

        val startedAt = Instant.now()
        val fromHour = from.truncatedTo(ChronoUnit.HOURS)
        val toHour = to.truncatedTo(ChronoUnit.HOURS).plus(1, ChronoUnit.HOURS)

        rebuildHeatmapRollups(fromHour, toHour)
        rebuildSessionSummaries(fromHour, to)

        val durationMs = Duration.between(startedAt, Instant.now()).toMillis()
        logger.info(
            "Analytics rollup finished: from={} to={} durationMs={}",
            fromHour,
            to,
            durationMs
        )
    }

    private fun rebuildHeatmapRollups(from: Instant, to: Instant) {
        heatmapRepository.deleteByBucketRange(from, to)
        heatmapTileRepository.deleteByBucketRange(from, to)

        val rows = mutableListOf<AnalyticsHeatmapHourly>()
        rows += clickEventRepository.findCountryRollups(from, to)
            .map { toHeatmapEntity(it, "COUNTRY") }
        rows += clickEventRepository.findOsRollups(from, to)
            .map { toHeatmapEntity(it, "OS") }
        rows += clickEventRepository.findDeviceRollups(from, to)
            .map { toHeatmapEntity(it, "DEVICE") }

        if (rows.isNotEmpty()) {
            heatmapRepository.saveAll(rows)
        }

        val tileRows = clickEventRepository.findTileRollups(from, to)
            .map { toHeatmapTileEntity(it) }

        if (tileRows.isNotEmpty()) {
            heatmapTileRepository.saveAll(tileRows)
        }
    }

    private fun toHeatmapEntity(row: HeatmapRollupProjection, dimension: String): AnalyticsHeatmapHourly {
        return AnalyticsHeatmapHourly(
            ownerUserId = row.getOwnerUserId(),
            slug = row.getSlug(),
            bucketStart = row.getBucketStart(),
            dimension = dimension,
            bucketKey = row.getBucketKey().ifBlank { "Unknown" }.take(120),
            clicks = row.getClicks(),
            updatedAt = Instant.now()
        )
    }

    private fun toHeatmapTileEntity(row: HeatmapTileRollupProjection): AnalyticsHeatmapTileHourly {
        val normalizedCountry = normalizeCountry(row.getCountry())
        return AnalyticsHeatmapTileHourly(
            ownerUserId = row.getOwnerUserId(),
            slug = row.getSlug(),
            bucketStart = row.getBucketStart(),
            country = normalizedCountry,
            continent = CountryContinentResolver.resolve(normalizedCountry),
            osName = row.getOsName().ifBlank { "Other" }.take(64),
            deviceType = row.getDeviceType().ifBlank { "Desktop" }.take(20),
            clicks = row.getClicks(),
            updatedAt = Instant.now()
        )
    }

    private fun normalizeCountry(country: String?): String {
        val normalized = country?.trim()?.uppercase().orEmpty()
        return if (normalized.length == 2 && normalized.all { it in 'A'..'Z' }) {
            normalized
        } else {
            "ZZ"
        }
    }

    private fun rebuildSessionSummaries(from: Instant, to: Instant) {
        val timeout = Duration.ofMinutes(sessionTimeoutMinutes)
        val scanFrom = from.minus(timeout)

        val slices = clickEventRepository.findSessionEventSlices(scanFrom, to)
        sessionSummaryRepository.deleteOverlappingRange(from, to)

        if (slices.isEmpty()) return

        val results = mutableListOf<AnalyticsSessionSummary>()
        var current: SessionAccumulator? = null

        for (slice in slices) {
            val isContinuation = current?.let {
                it.ownerUserId == slice.getOwnerUserId() &&
                    it.visitorId == slice.getVisitorId() &&
                    Duration.between(it.lastEventAt, slice.getCreatedAt()) <= timeout
            } ?: false

            if (!isContinuation) {
                current?.let { flushSession(it, results, from, to) }
                current = SessionAccumulator(
                    ownerUserId = slice.getOwnerUserId(),
                    visitorId = slice.getVisitorId(),
                    startedAt = slice.getCreatedAt(),
                    lastEventAt = slice.getCreatedAt(),
                    clicks = 1,
                    entrySlug = slice.getSlug(),
                    exitSlug = slice.getSlug(),
                    osName = slice.getOsName(),
                    deviceType = slice.getDeviceType(),
                    country = slice.getCountry()
                )
                continue
            }

            val active = current ?: continue
            current = active.copy(
                lastEventAt = slice.getCreatedAt(),
                clicks = active.clicks + 1,
                exitSlug = slice.getSlug(),
                osName = active.osName ?: slice.getOsName(),
                deviceType = active.deviceType ?: slice.getDeviceType(),
                country = active.country ?: slice.getCountry()
            )
        }

        current?.let { flushSession(it, results, from, to) }
        if (results.isNotEmpty()) {
            sessionSummaryRepository.saveAll(results)
        }
    }

    private fun flushSession(
        acc: SessionAccumulator,
        sink: MutableList<AnalyticsSessionSummary>,
        from: Instant,
        to: Instant
    ) {
        if (acc.lastEventAt.isBefore(from) || acc.startedAt.isAfter(to)) return
        val duration = Duration.between(acc.startedAt, acc.lastEventAt).seconds.coerceAtLeast(0)
        sink += AnalyticsSessionSummary(
            ownerUserId = acc.ownerUserId,
            visitorId = acc.visitorId,
            sessionStart = acc.startedAt,
            sessionEnd = acc.lastEventAt,
            durationSeconds = duration,
            clicks = acc.clicks,
            entrySlug = acc.entrySlug,
            exitSlug = acc.exitSlug,
            osName = acc.osName,
            deviceType = acc.deviceType,
            country = acc.country,
            createdAt = Instant.now()
        )
    }

    private data class SessionAccumulator(
        val ownerUserId: UUID,
        val visitorId: String,
        val startedAt: Instant,
        val lastEventAt: Instant,
        val clicks: Long,
        val entrySlug: String,
        val exitSlug: String,
        val osName: String?,
        val deviceType: String?,
        val country: String?
    )
}

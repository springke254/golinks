package com.golinks.golinks.service

import com.golinks.golinks.dto.*
import com.golinks.golinks.repository.ClickEventRepository
import com.golinks.golinks.repository.ShortUrlRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.Instant
import java.util.UUID

@Service
class AnalyticsService(
    private val clickEventRepository: ClickEventRepository,
    private val shortUrlRepository: ShortUrlRepository
) {

    private val logger = LoggerFactory.getLogger(AnalyticsService::class.java)

    private fun getUserSlugs(userId: UUID): List<String> {
        val links = shortUrlRepository.findAllSlugsByUserId(userId)
        return links
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
}

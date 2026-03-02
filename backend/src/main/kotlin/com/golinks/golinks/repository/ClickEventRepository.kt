package com.golinks.golinks.repository

import com.golinks.golinks.entity.ClickEventEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

interface DailyClickProjection {
    fun getDate(): String
    fun getClicks(): Long
}

interface ReferrerProjection {
    fun getReferrer(): String
    fun getCount(): Long
}

interface TopLinkProjection {
    fun getSlug(): String
    fun getTitle(): String?
    fun getClicks(): Long
}

@Repository
interface ClickEventRepository : JpaRepository<ClickEventEntity, UUID> {

    fun countBySlugInAndCreatedAtBetween(slugs: List<String>, from: Instant, to: Instant): Long

    @Query(
        value = """
            SELECT COUNT(DISTINCT ip) 
            FROM click_events 
            WHERE slug IN :slugs 
              AND created_at BETWEEN :fromDate AND :toDate 
              AND ip IS NOT NULL
        """,
        nativeQuery = true
    )
    fun countDistinctIpBySlugIn(slugs: List<String>, fromDate: Instant, toDate: Instant): Long

    @Query(
        value = """
            SELECT TO_CHAR(DATE(created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
                   COUNT(*) AS clicks
            FROM click_events
            WHERE slug IN :slugs
              AND created_at BETWEEN :fromDate AND :toDate
            GROUP BY DATE(created_at AT TIME ZONE 'UTC')
            ORDER BY date ASC
        """,
        nativeQuery = true
    )
    fun findClicksPerDay(slugs: List<String>, fromDate: Instant, toDate: Instant): List<DailyClickProjection>

    @Query(
        value = """
            SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer,
                   COUNT(*) AS count
            FROM click_events
            WHERE slug IN :slugs
              AND created_at BETWEEN :fromDate AND :toDate
            GROUP BY COALESCE(NULLIF(referrer, ''), 'Direct')
            ORDER BY count DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findTopReferrers(slugs: List<String>, fromDate: Instant, toDate: Instant, lim: Int): List<ReferrerProjection>

    @Query(
        value = """
            SELECT ce.slug AS slug,
                   su.title AS title,
                   COUNT(*) AS clicks
            FROM click_events ce
            LEFT JOIN short_urls su ON su.slug = ce.slug
            WHERE ce.slug IN :slugs
              AND ce.created_at BETWEEN :fromDate AND :toDate
            GROUP BY ce.slug, su.title
            ORDER BY clicks DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findTopLinks(slugs: List<String>, fromDate: Instant, toDate: Instant, lim: Int): List<TopLinkProjection>
}

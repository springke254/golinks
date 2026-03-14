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

interface HeatmapRollupProjection {
    fun getOwnerUserId(): UUID
    fun getSlug(): String
    fun getBucketStart(): Instant
    fun getBucketKey(): String
    fun getClicks(): Long
}

interface SessionEventSliceProjection {
    fun getOwnerUserId(): UUID
    fun getVisitorId(): String
    fun getSlug(): String
    fun getCreatedAt(): Instant
    fun getOsName(): String?
    fun getDeviceType(): String?
    fun getCountry(): String?
}

interface SessionDrilldownProjection {
    fun getSlug(): String
    fun getClickedAt(): Instant
    fun getReferrer(): String?
    fun getCountry(): String?
    fun getOsName(): String?
    fun getBrowserName(): String?
    fun getDeviceType(): String?
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

    @Query(
        value = """
            SELECT ce.owner_user_id AS ownerUserId,
                   ce.slug AS slug,
                   DATE_TRUNC('hour', ce.created_at) AS bucketStart,
                   COALESCE(NULLIF(ce.country, ''), 'Unknown') AS bucketKey,
                   COUNT(*) AS clicks
            FROM click_events ce
            WHERE ce.owner_user_id IS NOT NULL
              AND ce.created_at BETWEEN :fromDate AND :toDate
            GROUP BY ce.owner_user_id, ce.slug, DATE_TRUNC('hour', ce.created_at), COALESCE(NULLIF(ce.country, ''), 'Unknown')
        """,
        nativeQuery = true
    )
    fun findCountryRollups(fromDate: Instant, toDate: Instant): List<HeatmapRollupProjection>

    @Query(
        value = """
            SELECT ce.owner_user_id AS ownerUserId,
                   ce.slug AS slug,
                   DATE_TRUNC('hour', ce.created_at) AS bucketStart,
                   COALESCE(NULLIF(ce.os_name, ''), 'Other') AS bucketKey,
                   COUNT(*) AS clicks
            FROM click_events ce
            WHERE ce.owner_user_id IS NOT NULL
              AND ce.created_at BETWEEN :fromDate AND :toDate
            GROUP BY ce.owner_user_id, ce.slug, DATE_TRUNC('hour', ce.created_at), COALESCE(NULLIF(ce.os_name, ''), 'Other')
        """,
        nativeQuery = true
    )
    fun findOsRollups(fromDate: Instant, toDate: Instant): List<HeatmapRollupProjection>

    @Query(
        value = """
            SELECT ce.owner_user_id AS ownerUserId,
                   ce.slug AS slug,
                   DATE_TRUNC('hour', ce.created_at) AS bucketStart,
                   COALESCE(NULLIF(ce.device_type, ''), 'Desktop') AS bucketKey,
                   COUNT(*) AS clicks
            FROM click_events ce
            WHERE ce.owner_user_id IS NOT NULL
              AND ce.created_at BETWEEN :fromDate AND :toDate
            GROUP BY ce.owner_user_id, ce.slug, DATE_TRUNC('hour', ce.created_at), COALESCE(NULLIF(ce.device_type, ''), 'Desktop')
        """,
        nativeQuery = true
    )
    fun findDeviceRollups(fromDate: Instant, toDate: Instant): List<HeatmapRollupProjection>

    @Query(
        value = """
            SELECT ce.owner_user_id AS ownerUserId,
                   ce.visitor_id AS visitorId,
                   ce.slug AS slug,
                   ce.created_at AS createdAt,
                   ce.os_name AS osName,
                   ce.device_type AS deviceType,
                   ce.country AS country
            FROM click_events ce
            WHERE ce.owner_user_id IS NOT NULL
              AND ce.visitor_id IS NOT NULL
              AND ce.created_at BETWEEN :fromDate AND :toDate
            ORDER BY ce.owner_user_id, ce.visitor_id, ce.created_at
        """,
        nativeQuery = true
    )
    fun findSessionEventSlices(fromDate: Instant, toDate: Instant): List<SessionEventSliceProjection>

    @Query(
        value = """
            SELECT ce.slug AS slug,
                   ce.created_at AS clickedAt,
                   ce.referrer AS referrer,
                   ce.country AS country,
                   ce.os_name AS osName,
                   ce.browser_name AS browserName,
                   ce.device_type AS deviceType
            FROM click_events ce
            WHERE ce.owner_user_id = :ownerUserId
              AND ce.visitor_id = :visitorId
              AND ce.created_at BETWEEN :fromDate AND :toDate
            ORDER BY ce.created_at ASC
            LIMIT :lim OFFSET :offsetRows
        """,
        nativeQuery = true
    )
    fun findSessionEvents(
        ownerUserId: UUID,
        visitorId: String,
        fromDate: Instant,
        toDate: Instant,
        lim: Int,
        offsetRows: Int
    ): List<SessionDrilldownProjection>

    @Query(
        value = """
            SELECT COUNT(*)
            FROM click_events ce
            WHERE ce.owner_user_id = :ownerUserId
              AND ce.visitor_id = :visitorId
              AND ce.created_at BETWEEN :fromDate AND :toDate
        """,
        nativeQuery = true
    )
    fun countSessionEvents(ownerUserId: UUID, visitorId: String, fromDate: Instant, toDate: Instant): Long
}

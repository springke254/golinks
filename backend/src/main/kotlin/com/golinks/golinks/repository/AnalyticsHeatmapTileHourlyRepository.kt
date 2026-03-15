package com.golinks.golinks.repository

import com.golinks.golinks.entity.AnalyticsHeatmapTileHourly
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

interface HeatmapTilePointProjection {
    fun getBucketStart(): Instant
    fun getBucketKey(): String
    fun getClicks(): Long
}

interface HeatmapTileTotalProjection {
    fun getBucketKey(): String
    fun getClicks(): Long
}

interface HeatmapTileAvailabilityProjection {
    fun getEarliestBucket(): Instant?
    fun getLatestBucket(): Instant?
    fun getUpdatedAt(): Instant?
}

interface HeatmapFilterOptionProjection {
    fun getKey(): String
    fun getClicks(): Long
}

interface LinkSparklineProjection {
    fun getSlug(): String
    fun getBucketStart(): Instant
    fun getClicks(): Long
}

@Repository
interface AnalyticsHeatmapTileHourlyRepository : JpaRepository<AnalyticsHeatmapTileHourly, UUID> {

    @Modifying
    @Transactional
    @Query("DELETE FROM AnalyticsHeatmapTileHourly h WHERE h.bucketStart >= :fromDate AND h.bucketStart <= :toDate")
    fun deleteByBucketRange(fromDate: Instant, toDate: Instant): Int

    @Query(
        value = """
            WITH filtered AS (
                SELECT
                    CASE
                        WHEN :granularity = 'daily' THEN DATE_TRUNC('day', bucket_start)
                        ELSE DATE_TRUNC('hour', bucket_start)
                    END AS grouped_bucket,
                    CASE
                        WHEN :dimension = 'COUNTRY' THEN COALESCE(NULLIF(country, ''), 'ZZ')
                        WHEN :dimension = 'CONTINENT' THEN COALESCE(NULLIF(continent, ''), 'Unknown')
                        WHEN :dimension = 'OS' THEN COALESCE(NULLIF(os_name, ''), 'Other')
                        ELSE COALESCE(NULLIF(device_type, ''), 'Desktop')
                    END AS grouped_key,
                    clicks
                FROM analytics_heatmap_tiles_hourly
                WHERE owner_user_id = :userId
                  AND bucket_start BETWEEN :fromDate AND :toDate
                  AND (:slug = '' OR slug = :slug)
                  AND (:country = '' OR country = :country)
                  AND (:continent = '' OR continent = :continent)
                  AND (:osName = '' OR os_name = :osName)
                  AND (:deviceType = '' OR device_type = :deviceType)
            )
            SELECT grouped_bucket AS bucketStart,
                   grouped_key AS bucketKey,
                   SUM(clicks) AS clicks
            FROM filtered
            GROUP BY grouped_bucket, grouped_key
            ORDER BY grouped_bucket ASC, clicks DESC
        """,
        nativeQuery = true
    )
    fun findHeatmapPoints(
        userId: UUID,
        dimension: String,
        fromDate: Instant,
        toDate: Instant,
        slug: String,
        country: String,
        continent: String,
        osName: String,
        deviceType: String,
        granularity: String
    ): List<HeatmapTilePointProjection>

    @Query(
        value = """
            WITH filtered AS (
                SELECT
                    CASE
                        WHEN :dimension = 'COUNTRY' THEN COALESCE(NULLIF(country, ''), 'ZZ')
                        WHEN :dimension = 'CONTINENT' THEN COALESCE(NULLIF(continent, ''), 'Unknown')
                        WHEN :dimension = 'OS' THEN COALESCE(NULLIF(os_name, ''), 'Other')
                        ELSE COALESCE(NULLIF(device_type, ''), 'Desktop')
                    END AS grouped_key,
                    clicks
                FROM analytics_heatmap_tiles_hourly
                WHERE owner_user_id = :userId
                  AND bucket_start BETWEEN :fromDate AND :toDate
                  AND (:slug = '' OR slug = :slug)
                  AND (:country = '' OR country = :country)
                  AND (:continent = '' OR continent = :continent)
                  AND (:osName = '' OR os_name = :osName)
                  AND (:deviceType = '' OR device_type = :deviceType)
            )
            SELECT grouped_key AS bucketKey,
                   SUM(clicks) AS clicks
            FROM filtered
            GROUP BY grouped_key
            ORDER BY clicks DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findHeatmapTotals(
        userId: UUID,
        dimension: String,
        fromDate: Instant,
        toDate: Instant,
        slug: String,
        country: String,
        continent: String,
        osName: String,
        deviceType: String,
        lim: Int
    ): List<HeatmapTileTotalProjection>

    @Query(
        value = """
            SELECT COALESCE(NULLIF(continent, ''), 'Unknown') AS key,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_tiles_hourly
            WHERE owner_user_id = :userId
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND (:slug = '' OR slug = :slug)
              AND (:country = '' OR country = :country)
              AND (:osName = '' OR os_name = :osName)
              AND (:deviceType = '' OR device_type = :deviceType)
            GROUP BY COALESCE(NULLIF(continent, ''), 'Unknown')
            ORDER BY clicks DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findContinentOptions(
        userId: UUID,
        fromDate: Instant,
        toDate: Instant,
        slug: String,
        country: String,
        osName: String,
        deviceType: String,
        lim: Int
    ): List<HeatmapFilterOptionProjection>

    @Query(
        value = """
            SELECT COALESCE(NULLIF(country, ''), 'ZZ') AS key,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_tiles_hourly
            WHERE owner_user_id = :userId
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND (:slug = '' OR slug = :slug)
              AND (:continent = '' OR continent = :continent)
              AND (:osName = '' OR os_name = :osName)
              AND (:deviceType = '' OR device_type = :deviceType)
            GROUP BY COALESCE(NULLIF(country, ''), 'ZZ')
            ORDER BY clicks DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findCountryOptions(
        userId: UUID,
        fromDate: Instant,
        toDate: Instant,
        slug: String,
        continent: String,
        osName: String,
        deviceType: String,
        lim: Int
    ): List<HeatmapFilterOptionProjection>

    @Query(
        value = """
            SELECT COALESCE(NULLIF(os_name, ''), 'Other') AS key,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_tiles_hourly
            WHERE owner_user_id = :userId
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND (:slug = '' OR slug = :slug)
              AND (:country = '' OR country = :country)
              AND (:continent = '' OR continent = :continent)
              AND (:deviceType = '' OR device_type = :deviceType)
            GROUP BY COALESCE(NULLIF(os_name, ''), 'Other')
            ORDER BY clicks DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findOsOptions(
        userId: UUID,
        fromDate: Instant,
        toDate: Instant,
        slug: String,
        country: String,
        continent: String,
        deviceType: String,
        lim: Int
    ): List<HeatmapFilterOptionProjection>

    @Query(
        value = """
            SELECT COALESCE(NULLIF(device_type, ''), 'Desktop') AS key,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_tiles_hourly
            WHERE owner_user_id = :userId
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND (:slug = '' OR slug = :slug)
              AND (:country = '' OR country = :country)
              AND (:continent = '' OR continent = :continent)
              AND (:osName = '' OR os_name = :osName)
            GROUP BY COALESCE(NULLIF(device_type, ''), 'Desktop')
            ORDER BY clicks DESC
            LIMIT :lim
        """,
        nativeQuery = true
    )
    fun findDeviceOptions(
        userId: UUID,
        fromDate: Instant,
        toDate: Instant,
        slug: String,
        country: String,
        continent: String,
        osName: String,
        lim: Int
    ): List<HeatmapFilterOptionProjection>

    @Query(
        value = """
            SELECT MIN(bucket_start) AS earliestBucket,
                   MAX(bucket_start) AS latestBucket,
                   MAX(updated_at) AS updatedAt
            FROM analytics_heatmap_tiles_hourly
            WHERE owner_user_id = :userId
        """,
        nativeQuery = true
    )
    fun findAvailability(userId: UUID): HeatmapTileAvailabilityProjection?

    @Query(
        value = """
            SELECT slug AS slug,
                   CASE
                       WHEN :granularity = 'daily' THEN DATE_TRUNC('day', bucket_start)
                       ELSE DATE_TRUNC('hour', bucket_start)
                   END AS bucketStart,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_tiles_hourly
            WHERE owner_user_id = :userId
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND slug IN :slugs
            GROUP BY slug,
                     CASE
                         WHEN :granularity = 'daily' THEN DATE_TRUNC('day', bucket_start)
                         ELSE DATE_TRUNC('hour', bucket_start)
                     END
            ORDER BY slug ASC, bucketStart ASC
        """,
        nativeQuery = true
    )
    fun findLinkSparklines(
        userId: UUID,
        fromDate: Instant,
        toDate: Instant,
        slugs: List<String>,
        granularity: String
    ): List<LinkSparklineProjection>
}

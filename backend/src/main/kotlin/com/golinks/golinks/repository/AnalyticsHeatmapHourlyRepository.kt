package com.golinks.golinks.repository

import com.golinks.golinks.entity.AnalyticsHeatmapHourly
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

interface HeatmapPointProjection {
    fun getBucketStart(): Instant
    fun getBucketKey(): String
    fun getClicks(): Long
}

interface HeatmapTotalProjection {
    fun getBucketKey(): String
    fun getClicks(): Long
}

interface HeatmapAvailabilityProjection {
    fun getEarliestBucket(): Instant?
    fun getLatestBucket(): Instant?
    fun getUpdatedAt(): Instant?
}

@Repository
interface AnalyticsHeatmapHourlyRepository : JpaRepository<AnalyticsHeatmapHourly, UUID> {

    @Modifying
    @Transactional
    @Query("DELETE FROM AnalyticsHeatmapHourly h WHERE h.bucketStart >= :fromDate AND h.bucketStart <= :toDate")
    fun deleteByBucketRange(fromDate: Instant, toDate: Instant): Int

    @Query(
        value = """
            SELECT bucket_start AS bucketStart,
                   bucket_key AS bucketKey,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_hourly
            WHERE owner_user_id = :userId
              AND dimension = :dimension
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND (:slug = '' OR slug = :slug)
            GROUP BY bucket_start, bucket_key
            ORDER BY bucket_start ASC, clicks DESC
        """,
        nativeQuery = true
    )
    fun findHeatmapPoints(
        userId: UUID,
        dimension: String,
        fromDate: Instant,
        toDate: Instant,
        slug: String
    ): List<HeatmapPointProjection>

    @Query(
        value = """
            SELECT bucket_key AS bucketKey,
                   SUM(clicks) AS clicks
            FROM analytics_heatmap_hourly
            WHERE owner_user_id = :userId
              AND dimension = :dimension
              AND bucket_start BETWEEN :fromDate AND :toDate
              AND (:slug = '' OR slug = :slug)
            GROUP BY bucket_key
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
        lim: Int
    ): List<HeatmapTotalProjection>

    @Query(
        value = """
            SELECT DISTINCT dimension
            FROM analytics_heatmap_hourly
            WHERE owner_user_id = :userId
            ORDER BY dimension
        """,
        nativeQuery = true
    )
    fun findDistinctDimensions(userId: UUID): List<String>

    @Query(
        value = """
            SELECT MIN(bucket_start) AS earliestBucket,
                   MAX(bucket_start) AS latestBucket,
                   MAX(updated_at) AS updatedAt
            FROM analytics_heatmap_hourly
            WHERE owner_user_id = :userId
        """,
        nativeQuery = true
    )
    fun findAvailability(userId: UUID): HeatmapAvailabilityProjection?
}

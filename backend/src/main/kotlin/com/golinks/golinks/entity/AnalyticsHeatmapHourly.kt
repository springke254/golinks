package com.golinks.golinks.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "analytics_heatmap_hourly")
class AnalyticsHeatmapHourly(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "owner_user_id", nullable = false)
    val ownerUserId: UUID,

    @Column(nullable = false, length = 50)
    val slug: String,

    @Column(name = "bucket_start", nullable = false)
    val bucketStart: Instant,

    @Column(nullable = false, length = 20)
    val dimension: String,

    @Column(name = "bucket_key", nullable = false, length = 120)
    val bucketKey: String,

    @Column(nullable = false)
    val clicks: Long,

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)

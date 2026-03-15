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
@Table(name = "analytics_heatmap_tiles_hourly")
class AnalyticsHeatmapTileHourly(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "owner_user_id", nullable = false)
    val ownerUserId: UUID,

    @Column(nullable = false, length = 50)
    val slug: String,

    @Column(name = "bucket_start", nullable = false)
    val bucketStart: Instant,

    @Column(nullable = false, length = 2)
    val country: String,

    @Column(nullable = false, length = 16)
    val continent: String,

    @Column(name = "os_name", nullable = false, length = 64)
    val osName: String,

    @Column(name = "device_type", nullable = false, length = 20)
    val deviceType: String,

    @Column(nullable = false)
    val clicks: Long,

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)

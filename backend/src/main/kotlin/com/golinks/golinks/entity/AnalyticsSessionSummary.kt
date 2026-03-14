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
@Table(name = "analytics_session_summary")
class AnalyticsSessionSummary(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "owner_user_id", nullable = false)
    val ownerUserId: UUID,

    @Column(name = "visitor_id", nullable = false, length = 128)
    val visitorId: String,

    @Column(name = "session_start", nullable = false)
    val sessionStart: Instant,

    @Column(name = "session_end", nullable = false)
    val sessionEnd: Instant,

    @Column(name = "duration_seconds", nullable = false)
    val durationSeconds: Long,

    @Column(nullable = false)
    val clicks: Long,

    @Column(name = "entry_slug", length = 50)
    val entrySlug: String? = null,

    @Column(name = "exit_slug", length = 50)
    val exitSlug: String? = null,

    @Column(name = "os_name", length = 64)
    val osName: String? = null,

    @Column(name = "device_type", length = 20)
    val deviceType: String? = null,

    @Column(length = 2)
    val country: String? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)

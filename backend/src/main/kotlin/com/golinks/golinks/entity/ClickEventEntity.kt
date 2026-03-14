package com.golinks.golinks.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "click_events")
class ClickEventEntity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Column(name = "short_url_id")
    val shortUrlId: UUID? = null,

    @Column(name = "owner_user_id")
    val ownerUserId: UUID? = null,

    @Column(nullable = false, length = 50)
    val slug: String,

    @Column(length = 45)
    val ip: String? = null,

    @Column(name = "user_agent", columnDefinition = "TEXT")
    val userAgent: String? = null,

    @Column(columnDefinition = "TEXT")
    val referrer: String? = null,

    @Column(name = "visitor_id", length = 128)
    val visitorId: String? = null,

    @Column(name = "os_name", length = 64)
    val osName: String? = null,

    @Column(name = "browser_name", length = 64)
    val browserName: String? = null,

    @Column(name = "device_type", length = 20)
    val deviceType: String? = null,

    @Column(length = 120)
    val region: String? = null,

    @Column(length = 120)
    val city: String? = null,

    @Column(length = 2)
    val country: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)

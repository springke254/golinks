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

    @Column(nullable = false, length = 50)
    val slug: String,

    @Column(length = 45)
    val ip: String? = null,

    @Column(name = "user_agent", columnDefinition = "TEXT")
    val userAgent: String? = null,

    @Column(columnDefinition = "TEXT")
    val referrer: String? = null,

    @Column(length = 2)
    val country: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)

package com.golinks.golinks.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "short_urls")
class ShortUrl(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    var workspace: Workspace? = null,

    @Column(nullable = false, unique = true, length = 50)
    var slug: String,

    @Column(name = "destination_url", nullable = false, columnDefinition = "TEXT")
    var destinationUrl: String,

    @Column(length = 255)
    var title: String? = null,

    @ManyToMany(fetch = FetchType.LAZY, cascade = [CascadeType.PERSIST, CascadeType.MERGE])
    @JoinTable(
        name = "short_url_tags",
        joinColumns = [JoinColumn(name = "short_url_id")],
        inverseJoinColumns = [JoinColumn(name = "tag_id")]
    )
    var tags: MutableSet<Tag> = mutableSetOf(),

    @Column(name = "clicks_count", nullable = false)
    var clicksCount: Long = 0,

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(nullable = false)
    var deleted: Boolean = false,

    @Column(name = "password_hash")
    var passwordHash: String? = null,

    @Column(name = "is_private", nullable = false)
    var isPrivate: Boolean = false,

    @Column(name = "is_one_time", nullable = false)
    var isOneTime: Boolean = false,

    @Column(name = "expires_at")
    var expiresAt: Instant? = null,

    @Column(name = "max_clicks")
    var maxClicks: Int? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now(),

    @Column(name = "deleted_at")
    var deletedAt: Instant? = null
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }

    val isPasswordProtected: Boolean
        get() = passwordHash != null

    val isExpired: Boolean
        get() = expiresAt != null && Instant.now().isAfter(expiresAt)

    val isMaxClicksReached: Boolean
        get() = maxClicks != null && clicksCount >= maxClicks!!
}

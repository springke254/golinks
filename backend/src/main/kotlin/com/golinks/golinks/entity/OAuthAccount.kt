package com.golinks.golinks.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(
    name = "oauth_accounts",
    uniqueConstraints = [UniqueConstraint(columnNames = ["provider", "provider_user_id"])]
)
class OAuthAccount(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Column(nullable = false, length = 50)
    val provider: String,

    @Column(name = "provider_user_id", nullable = false, length = 255)
    val providerUserId: String,

    @Column(name = "provider_email", length = 255)
    var providerEmail: String? = null,

    @Column(name = "profile_metadata", columnDefinition = "jsonb")
    var profileMetadata: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)

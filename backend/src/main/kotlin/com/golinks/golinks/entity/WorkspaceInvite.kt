package com.golinks.golinks.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "workspace_invites")
class WorkspaceInvite(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    val workspace: Workspace,

    @Column(nullable = false, length = 255)
    val email: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val role: WorkspaceRole = WorkspaceRole.MEMBER,

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    var tokenHash: String,

    @Column(name = "expires_at", nullable = false)
    var expiresAt: Instant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    val createdBy: User,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "redeemed_by_user_id")
    var redeemedByUser: User? = null,

    @Column(name = "redeemed_at")
    var redeemedAt: Instant? = null,

    @Column(nullable = false)
    var revoked: Boolean = false
) {
    val isExpired: Boolean
        get() = Instant.now().isAfter(expiresAt)

    val isRedeemed: Boolean
        get() = redeemedAt != null

    val isValid: Boolean
        get() = !revoked && !isExpired && !isRedeemed
}

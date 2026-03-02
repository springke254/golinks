package com.golinks.golinks.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

enum class WorkspaceRole {
    OWNER, ADMIN, MEMBER;

    fun permissions(): Set<String> = when (this) {
        OWNER -> setOf("MANAGE_WORKSPACE", "MANAGE_MEMBERS", "MANAGE_INVITES", "MANAGE_LINKS", "VIEW_ANALYTICS", "VIEW_AUDIT")
        ADMIN -> setOf("MANAGE_MEMBERS", "MANAGE_INVITES", "MANAGE_LINKS", "VIEW_ANALYTICS", "VIEW_AUDIT")
        MEMBER -> setOf("MANAGE_LINKS", "VIEW_ANALYTICS")
    }
}

@Entity
@Table(name = "workspace_memberships")
class WorkspaceMembership(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id", nullable = false)
    val workspace: Workspace,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: WorkspaceRole = WorkspaceRole.MEMBER,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    val invitedBy: User? = null,

    @Column(name = "joined_at", nullable = false)
    val joinedAt: Instant = Instant.now(),

    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now()
)

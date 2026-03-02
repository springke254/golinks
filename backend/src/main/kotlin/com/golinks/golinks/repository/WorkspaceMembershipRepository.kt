package com.golinks.golinks.repository

import com.golinks.golinks.entity.WorkspaceMembership
import com.golinks.golinks.entity.WorkspaceRole
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface WorkspaceMembershipRepository : JpaRepository<WorkspaceMembership, UUID> {

    fun findByUserIdAndIsActiveTrue(userId: UUID): List<WorkspaceMembership>

    fun findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId: UUID, userId: UUID): WorkspaceMembership?

    fun findByWorkspaceIdAndIsActiveTrue(workspaceId: UUID, pageable: Pageable): Page<WorkspaceMembership>

    fun countByWorkspaceIdAndIsActiveTrue(workspaceId: UUID): Long

    fun countByWorkspaceIdAndRoleAndIsActiveTrue(workspaceId: UUID, role: WorkspaceRole): Long

    fun existsByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId: UUID, userId: UUID): Boolean

    @Query("SELECT m FROM WorkspaceMembership m WHERE m.workspace.id = :workspaceId AND m.user.id = :userId")
    fun findByWorkspaceIdAndUserId(workspaceId: UUID, userId: UUID): WorkspaceMembership?
}

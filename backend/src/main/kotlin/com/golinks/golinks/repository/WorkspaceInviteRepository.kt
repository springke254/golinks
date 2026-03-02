package com.golinks.golinks.repository

import com.golinks.golinks.entity.WorkspaceInvite
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface WorkspaceInviteRepository : JpaRepository<WorkspaceInvite, UUID> {

    fun findByTokenHash(tokenHash: String): WorkspaceInvite?

    fun findByWorkspaceIdAndRevokedFalse(workspaceId: UUID, pageable: Pageable): Page<WorkspaceInvite>

    fun existsByWorkspaceIdAndEmailAndRevokedFalseAndRedeemedAtIsNull(workspaceId: UUID, email: String): Boolean
}

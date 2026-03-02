package com.golinks.golinks.service

import com.golinks.golinks.dto.*
import com.golinks.golinks.entity.Workspace
import com.golinks.golinks.entity.WorkspaceMembership
import com.golinks.golinks.entity.WorkspaceRole
import com.golinks.golinks.exception.*
import com.golinks.golinks.repository.UserRepository
import com.golinks.golinks.repository.WorkspaceMembershipRepository
import com.golinks.golinks.repository.WorkspaceRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class WorkspaceService(
    private val workspaceRepository: WorkspaceRepository,
    private val membershipRepository: WorkspaceMembershipRepository,
    private val userRepository: UserRepository
) {

    private val logger = LoggerFactory.getLogger(WorkspaceService::class.java)

    @Transactional
    fun createWorkspace(request: CreateWorkspaceRequest, userId: UUID): WorkspaceResponse {
        val slug = request.slug.lowercase().trim()
        if (workspaceRepository.existsBySlug(slug)) {
            throw DuplicateSlugWorkspaceException()
        }

        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        val workspace = workspaceRepository.save(
            Workspace(
                name = request.name.trim(),
                slug = slug,
                description = request.description?.trim(),
                createdBy = user
            )
        )

        // Automatically make the creator an OWNER
        membershipRepository.save(
            WorkspaceMembership(
                workspace = workspace,
                user = user,
                role = WorkspaceRole.OWNER
            )
        )

        logger.info("Workspace '${workspace.slug}' created by user $userId")

        return toWorkspaceResponse(workspace, WorkspaceRole.OWNER, 1)
    }

    fun getUserWorkspaces(userId: UUID): List<WorkspaceResponse> {
        val memberships = membershipRepository.findByUserIdAndIsActiveTrue(userId)
        return memberships.map { m ->
            val memberCount = membershipRepository.countByWorkspaceIdAndIsActiveTrue(m.workspace.id!!)
            toWorkspaceResponse(m.workspace, m.role, memberCount)
        }
    }

    fun getWorkspace(workspaceId: UUID, userId: UUID): WorkspaceResponse {
        val workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow { WorkspaceNotFoundException() }

        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        val memberCount = membershipRepository.countByWorkspaceIdAndIsActiveTrue(workspaceId)
        return toWorkspaceResponse(workspace, membership.role, memberCount)
    }

    fun validateMembership(workspaceId: UUID, userId: UUID): WorkspaceMeResponse {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        return WorkspaceMeResponse(
            workspaceId = workspaceId,
            slug = membership.workspace.slug,
            role = membership.role.name,
            permissions = membership.role.permissions()
        )
    }

    @Transactional
    fun updateWorkspace(workspaceId: UUID, request: UpdateWorkspaceRequest, userId: UUID): WorkspaceResponse {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        if (membership.role != WorkspaceRole.OWNER) {
            throw InsufficientRoleException("Only workspace owners can update workspace settings")
        }

        val workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow { WorkspaceNotFoundException() }

        request.name?.let { workspace.name = it.trim() }
        request.description?.let { workspace.description = it.trim() }
        request.avatarUrl?.let { workspace.avatarUrl = it.trim() }
        request.slug?.let { newSlug ->
            val slugLower = newSlug.lowercase().trim()
            if (slugLower != workspace.slug && workspaceRepository.existsBySlug(slugLower)) {
                throw DuplicateSlugWorkspaceException()
            }
            workspace.slug = slugLower
        }

        val updated = workspaceRepository.save(workspace)
        val memberCount = membershipRepository.countByWorkspaceIdAndIsActiveTrue(workspaceId)
        return toWorkspaceResponse(updated, membership.role, memberCount)
    }

    @Transactional
    fun deleteWorkspace(workspaceId: UUID, userId: UUID) {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        if (membership.role != WorkspaceRole.OWNER) {
            throw InsufficientRoleException("Only workspace owners can delete the workspace")
        }

        val workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow { WorkspaceNotFoundException() }

        logger.warn("Workspace '${workspace.slug}' deleted by user $userId")
        workspaceRepository.delete(workspace)
    }

    fun checkSlugAvailability(slug: String): SlugAvailabilityResponse {
        return SlugAvailabilityResponse(!workspaceRepository.existsBySlug(slug.lowercase().trim()))
    }

    private fun toWorkspaceResponse(workspace: Workspace, role: WorkspaceRole, memberCount: Long): WorkspaceResponse {
        return WorkspaceResponse(
            id = workspace.id!!,
            name = workspace.name,
            slug = workspace.slug,
            description = workspace.description,
            avatarUrl = workspace.avatarUrl,
            memberCount = memberCount,
            role = role.name,
            createdAt = workspace.createdAt
        )
    }
}

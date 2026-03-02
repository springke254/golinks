package com.golinks.golinks.service

import com.golinks.golinks.dto.*
import com.golinks.golinks.entity.WorkspaceMembership
import com.golinks.golinks.entity.WorkspaceRole
import com.golinks.golinks.exception.*
import com.golinks.golinks.repository.UserRepository
import com.golinks.golinks.repository.WorkspaceMembershipRepository
import com.golinks.golinks.repository.WorkspaceRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class WorkspaceMembershipService(
    private val membershipRepository: WorkspaceMembershipRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val userRepository: UserRepository
) {

    private val logger = LoggerFactory.getLogger(WorkspaceMembershipService::class.java)

    fun getMembers(workspaceId: UUID, page: Int, size: Int, userId: UUID): PaginatedMembersResponse {
        // Verify the requesting user is a member
        membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        val pageable = PageRequest.of(page, size, Sort.by("joinedAt").descending())
        val membersPage = membershipRepository.findByWorkspaceIdAndIsActiveTrue(workspaceId, pageable)

        return PaginatedMembersResponse(
            items = membersPage.content.map { toMemberResponse(it) },
            page = membersPage.number,
            pageSize = membersPage.size,
            totalItems = membersPage.totalElements,
            totalPages = membersPage.totalPages
        )
    }

    @Transactional
    fun updateMemberRole(workspaceId: UUID, targetUserId: UUID, newRole: String, actingUserId: UUID): WorkspaceMemberResponse {
        val actingMembership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, actingUserId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        // Only OWNER can change roles
        if (actingMembership.role != WorkspaceRole.OWNER) {
            throw InsufficientRoleException("Only workspace owners can change member roles")
        }

        val targetMembership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, targetUserId)
            ?: throw UserNotFoundException("Member not found in this workspace")

        val role = try {
            WorkspaceRole.valueOf(newRole.uppercase())
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid role: $newRole. Must be OWNER, ADMIN, or MEMBER")
        }

        // Prevent removing the last OWNER by changing their role
        if (targetMembership.role == WorkspaceRole.OWNER && role != WorkspaceRole.OWNER) {
            val ownerCount = membershipRepository.countByWorkspaceIdAndRoleAndIsActiveTrue(workspaceId, WorkspaceRole.OWNER)
            if (ownerCount <= 1) {
                throw LastOwnerException()
            }
        }

        targetMembership.role = role
        val updated = membershipRepository.save(targetMembership)

        logger.info("Member role updated: user=$targetUserId, workspace=$workspaceId, newRole=$role, by=$actingUserId")
        return toMemberResponse(updated)
    }

    @Transactional
    fun removeMember(workspaceId: UUID, targetUserId: UUID, actingUserId: UUID) {
        val actingMembership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, actingUserId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        // OWNER or ADMIN can remove members (OWNER can remove anyone, ADMIN can remove MEMBER only)
        if (actingMembership.role == WorkspaceRole.MEMBER) {
            throw InsufficientRoleException("Only workspace owners and admins can remove members")
        }

        val targetMembership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, targetUserId)
            ?: throw UserNotFoundException("Member not found in this workspace")

        // ADMIN cannot remove OWNER or other ADMIN
        if (actingMembership.role == WorkspaceRole.ADMIN &&
            (targetMembership.role == WorkspaceRole.OWNER || targetMembership.role == WorkspaceRole.ADMIN)) {
            throw InsufficientRoleException("Admins cannot remove owners or other admins")
        }

        // Prevent removing the last OWNER
        if (targetMembership.role == WorkspaceRole.OWNER) {
            val ownerCount = membershipRepository.countByWorkspaceIdAndRoleAndIsActiveTrue(workspaceId, WorkspaceRole.OWNER)
            if (ownerCount <= 1) {
                throw LastOwnerException()
            }
        }

        targetMembership.isActive = false
        membershipRepository.save(targetMembership)

        logger.info("Member removed: user=$targetUserId, workspace=$workspaceId, by=$actingUserId")
    }

    @Transactional
    fun leaveWorkspace(workspaceId: UUID, userId: UUID) {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        // Prevent leaving if last OWNER
        if (membership.role == WorkspaceRole.OWNER) {
            val ownerCount = membershipRepository.countByWorkspaceIdAndRoleAndIsActiveTrue(workspaceId, WorkspaceRole.OWNER)
            if (ownerCount <= 1) {
                throw LastOwnerException("Cannot leave workspace as the last owner — transfer ownership first")
            }
        }

        membership.isActive = false
        membershipRepository.save(membership)

        logger.info("Member left workspace: user=$userId, workspace=$workspaceId")
    }

    private fun toMemberResponse(membership: WorkspaceMembership): WorkspaceMemberResponse {
        return WorkspaceMemberResponse(
            userId = membership.user.id!!,
            email = membership.user.email,
            displayName = membership.user.displayName,
            avatarUrl = membership.user.avatarUrl,
            role = membership.role.name,
            joinedAt = membership.joinedAt
        )
    }
}

package com.golinks.golinks.service

import com.golinks.golinks.dto.*
import com.golinks.golinks.entity.WorkspaceInvite
import com.golinks.golinks.entity.WorkspaceMembership
import com.golinks.golinks.entity.WorkspaceRole
import com.golinks.golinks.exception.*
import com.golinks.golinks.repository.UserRepository
import com.golinks.golinks.repository.WorkspaceInviteRepository
import com.golinks.golinks.repository.WorkspaceMembershipRepository
import com.golinks.golinks.repository.WorkspaceRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.security.SecureRandom
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.*

@Service
class WorkspaceInviteService(
    private val inviteRepository: WorkspaceInviteRepository,
    private val membershipRepository: WorkspaceMembershipRepository,
    private val workspaceRepository: WorkspaceRepository,
    private val userRepository: UserRepository,
    private val emailService: EmailService
) {

    private val logger = LoggerFactory.getLogger(WorkspaceInviteService::class.java)
    private val secureRandom = SecureRandom()

    @Transactional
    fun createInvite(workspaceId: UUID, request: CreateInviteRequest, createdByUserId: UUID): InviteResponse {
        val actingMembership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, createdByUserId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        if (actingMembership.role == WorkspaceRole.MEMBER) {
            throw InsufficientRoleException("Only workspace owners and admins can send invites")
        }

        val email = request.email.lowercase().trim()
        val role = try {
            WorkspaceRole.valueOf(request.role.uppercase())
        } catch (e: IllegalArgumentException) {
            throw IllegalArgumentException("Invalid role: ${request.role}. Must be ADMIN or MEMBER")
        }

        // ADMIN can only invite as MEMBER
        if (actingMembership.role == WorkspaceRole.ADMIN && role != WorkspaceRole.MEMBER) {
            throw InsufficientRoleException("Admins can only invite users as members")
        }

        // Check not OWNER role in invite
        if (role == WorkspaceRole.OWNER) {
            throw IllegalArgumentException("Cannot invite as OWNER. Use role transfer instead")
        }

        // Check if already a member
        val existingUser = userRepository.findByEmail(email)
        if (existingUser != null &&
            membershipRepository.existsByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, existingUser.id!!)) {
            throw AlreadyMemberException()
        }

        // Check for active pending invite
        if (inviteRepository.existsByWorkspaceIdAndEmailAndRevokedFalseAndRedeemedAtIsNull(workspaceId, email)) {
            throw AlreadyMemberException("An active invite already exists for this email")
        }

        val workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow { WorkspaceNotFoundException() }

        val inviter = userRepository.findById(createdByUserId)
            .orElseThrow { UserNotFoundException() }

        // Generate secure token
        val rawToken = generateSecureToken()
        val tokenHash = hashToken(rawToken)

        val invite = inviteRepository.save(
            WorkspaceInvite(
                workspace = workspace,
                email = email,
                role = role,
                tokenHash = tokenHash,
                expiresAt = Instant.now().plus(7, ChronoUnit.DAYS),
                createdBy = inviter
            )
        )

        // Send invite email
        emailService.sendWorkspaceInviteEmail(
            email = email,
            inviterName = inviter.displayName,
            workspaceName = workspace.name,
            inviteToken = rawToken,
            role = role.name
        )

        logger.info("Invite created: workspace=${workspace.slug}, email=$email, role=$role, by=$createdByUserId")
        return toInviteResponse(invite)
    }

    fun getInvites(workspaceId: UUID, page: Int, size: Int, userId: UUID): PaginatedInvitesResponse {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        if (membership.role == WorkspaceRole.MEMBER) {
            throw InsufficientRoleException("Only workspace owners and admins can view invites")
        }

        val pageable = PageRequest.of(page, size, Sort.by("createdAt").descending())
        val invitesPage = inviteRepository.findByWorkspaceIdAndRevokedFalse(workspaceId, pageable)

        return PaginatedInvitesResponse(
            items = invitesPage.content.map { toInviteResponse(it) },
            page = invitesPage.number,
            pageSize = invitesPage.size,
            totalItems = invitesPage.totalElements,
            totalPages = invitesPage.totalPages
        )
    }

    fun validateInviteToken(rawToken: String): InviteValidationResponse {
        val tokenHash = hashToken(rawToken)
        val invite = inviteRepository.findByTokenHash(tokenHash)

        if (invite == null) {
            return InviteValidationResponse(
                valid = false, workspaceName = null, workspaceSlug = null,
                inviterName = null, role = null, email = null,
                error = "Invalid invite link", errorCode = "INVALID_TOKEN"
            )
        }

        if (invite.revoked) {
            return InviteValidationResponse(
                valid = false, workspaceName = invite.workspace.name,
                workspaceSlug = invite.workspace.slug,
                inviterName = invite.createdBy.displayName, role = invite.role.name,
                email = invite.email,
                error = "This invite has been revoked", errorCode = "INVITE_REVOKED"
            )
        }

        if (invite.isExpired) {
            return InviteValidationResponse(
                valid = false, workspaceName = invite.workspace.name,
                workspaceSlug = invite.workspace.slug,
                inviterName = invite.createdBy.displayName, role = invite.role.name,
                email = invite.email,
                error = "This invite has expired", errorCode = "INVITE_EXPIRED"
            )
        }

        if (invite.isRedeemed) {
            return InviteValidationResponse(
                valid = false, workspaceName = invite.workspace.name,
                workspaceSlug = invite.workspace.slug,
                inviterName = invite.createdBy.displayName, role = invite.role.name,
                email = invite.email,
                error = "This invite has already been accepted", errorCode = "ALREADY_REDEEMED"
            )
        }

        return InviteValidationResponse(
            valid = true,
            workspaceName = invite.workspace.name,
            workspaceSlug = invite.workspace.slug,
            inviterName = invite.createdBy.displayName,
            role = invite.role.name,
            email = invite.email
        )
    }

    @Transactional
    fun acceptInvite(rawToken: String, userId: UUID): WorkspaceResponse {
        val tokenHash = hashToken(rawToken)
        val invite = inviteRepository.findByTokenHash(tokenHash)
            ?: throw InvalidTokenException("Invalid invite token")

        if (invite.revoked) throw InviteRevokedException()
        if (invite.isExpired) throw InviteExpiredException()
        if (invite.isRedeemed) throw InvalidTokenException("This invite has already been accepted")

        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        val workspace = invite.workspace

        // Check if already a member (idempotent)
        val existing = membershipRepository.findByWorkspaceIdAndUserId(workspace.id!!, userId)
        if (existing != null) {
            if (existing.isActive) {
                // Mark invite as redeemed and return workspace
                invite.redeemedByUser = user
                invite.redeemedAt = Instant.now()
                inviteRepository.save(invite)

                val memberCount = membershipRepository.countByWorkspaceIdAndIsActiveTrue(workspace.id!!)
                return WorkspaceResponse(
                    id = workspace.id!!, name = workspace.name, slug = workspace.slug,
                    description = workspace.description, avatarUrl = workspace.avatarUrl,
                    memberCount = memberCount, role = existing.role.name, createdAt = workspace.createdAt
                )
            } else {
                // Re-activate membership
                existing.isActive = true
                existing.role = invite.role
                membershipRepository.save(existing)
            }
        } else {
            // Create new membership
            membershipRepository.save(
                WorkspaceMembership(
                    workspace = workspace,
                    user = user,
                    role = invite.role,
                    invitedBy = invite.createdBy
                )
            )
        }

        // Mark invite as redeemed
        invite.redeemedByUser = user
        invite.redeemedAt = Instant.now()
        inviteRepository.save(invite)

        val memberCount = membershipRepository.countByWorkspaceIdAndIsActiveTrue(workspace.id!!)
        logger.info("Invite accepted: workspace=${workspace.slug}, user=$userId, role=${invite.role}")

        return WorkspaceResponse(
            id = workspace.id!!, name = workspace.name, slug = workspace.slug,
            description = workspace.description, avatarUrl = workspace.avatarUrl,
            memberCount = memberCount, role = invite.role.name, createdAt = workspace.createdAt
        )
    }

    @Transactional
    fun revokeInvite(workspaceId: UUID, inviteId: UUID, userId: UUID) {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        if (membership.role == WorkspaceRole.MEMBER) {
            throw InsufficientRoleException("Only workspace owners and admins can revoke invites")
        }

        val invite = inviteRepository.findById(inviteId)
            .orElseThrow { InvalidTokenException("Invite not found") }

        if (invite.workspace.id != workspaceId) {
            throw InvalidTokenException("Invite does not belong to this workspace")
        }

        invite.revoked = true
        inviteRepository.save(invite)

        logger.info("Invite revoked: inviteId=$inviteId, workspace=$workspaceId, by=$userId")
    }

    @Transactional
    fun resendInvite(workspaceId: UUID, inviteId: UUID, userId: UUID): InviteResponse {
        val membership = membershipRepository.findByWorkspaceIdAndUserIdAndIsActiveTrue(workspaceId, userId)
            ?: throw InsufficientRoleException("You are not a member of this workspace")

        if (membership.role == WorkspaceRole.MEMBER) {
            throw InsufficientRoleException("Only workspace owners and admins can resend invites")
        }

        val invite = inviteRepository.findById(inviteId)
            .orElseThrow { InvalidTokenException("Invite not found") }

        if (invite.workspace.id != workspaceId) {
            throw InvalidTokenException("Invite does not belong to this workspace")
        }

        val inviter = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        // Generate new token and extend expiry
        val rawToken = generateSecureToken()
        invite.tokenHash = hashToken(rawToken)
        invite.expiresAt = Instant.now().plus(7, ChronoUnit.DAYS)
        invite.revoked = false
        val updated = inviteRepository.save(invite)

        // Resend email
        emailService.sendWorkspaceInviteEmail(
            email = invite.email,
            inviterName = inviter.displayName,
            workspaceName = invite.workspace.name,
            inviteToken = rawToken,
            role = invite.role.name
        )

        logger.info("Invite resent: inviteId=$inviteId, workspace=$workspaceId, by=$userId")
        return toInviteResponse(updated)
    }

    private fun generateSecureToken(): String {
        val bytes = ByteArray(32)
        secureRandom.nextBytes(bytes)
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
    }

    private fun hashToken(rawToken: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(rawToken.toByteArray())
        return hash.joinToString("") { "%02x".format(it) }
    }

    private fun toInviteResponse(invite: WorkspaceInvite): InviteResponse {
        val status = when {
            invite.revoked -> "REVOKED"
            invite.isExpired -> "EXPIRED"
            invite.isRedeemed -> "ACCEPTED"
            else -> "PENDING"
        }
        return InviteResponse(
            id = invite.id!!,
            email = invite.email,
            role = invite.role.name,
            expiresAt = invite.expiresAt,
            createdAt = invite.createdAt,
            status = status
        )
    }
}

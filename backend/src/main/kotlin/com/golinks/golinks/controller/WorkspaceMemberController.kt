package com.golinks.golinks.controller

import com.golinks.golinks.dto.UpdateMemberRoleRequest
import com.golinks.golinks.service.WorkspaceMembershipService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/members")
class WorkspaceMemberController(
    private val membershipService: WorkspaceMembershipService
) {

    @GetMapping
    fun getMembers(
        @PathVariable workspaceId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(membershipService.getMembers(workspaceId, page, size, userId))
    }

    @PutMapping("/{targetUserId}")
    fun updateMemberRole(
        @PathVariable workspaceId: UUID,
        @PathVariable targetUserId: UUID,
        @Valid @RequestBody request: UpdateMemberRoleRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(membershipService.updateMemberRole(workspaceId, targetUserId, request.role, userId))
    }

    @DeleteMapping("/{targetUserId}")
    fun removeMember(
        @PathVariable workspaceId: UUID,
        @PathVariable targetUserId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        membershipService.removeMember(workspaceId, targetUserId, userId)
        return ResponseEntity.noContent().build<Any>()
    }

    @DeleteMapping("/me")
    fun leaveWorkspace(
        @PathVariable workspaceId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        membershipService.leaveWorkspace(workspaceId, userId)
        return ResponseEntity.noContent().build<Any>()
    }
}

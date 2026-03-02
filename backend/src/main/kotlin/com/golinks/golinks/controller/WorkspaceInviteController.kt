package com.golinks.golinks.controller

import com.golinks.golinks.dto.CreateInviteRequest
import com.golinks.golinks.service.WorkspaceInviteService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/workspaces/{workspaceId}/invites")
class WorkspaceInviteController(
    private val inviteService: WorkspaceInviteService
) {

    @PostMapping
    fun createInvite(
        @PathVariable workspaceId: UUID,
        @Valid @RequestBody request: CreateInviteRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        val invite = inviteService.createInvite(workspaceId, request, userId)
        return ResponseEntity.status(HttpStatus.CREATED).body(invite)
    }

    @GetMapping
    fun getInvites(
        @PathVariable workspaceId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(inviteService.getInvites(workspaceId, page, size, userId))
    }

    @DeleteMapping("/{inviteId}")
    fun revokeInvite(
        @PathVariable workspaceId: UUID,
        @PathVariable inviteId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        inviteService.revokeInvite(workspaceId, inviteId, userId)
        return ResponseEntity.noContent().build<Any>()
    }

    @PostMapping("/{inviteId}/resend")
    fun resendInvite(
        @PathVariable workspaceId: UUID,
        @PathVariable inviteId: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(inviteService.resendInvite(workspaceId, inviteId, userId))
    }
}

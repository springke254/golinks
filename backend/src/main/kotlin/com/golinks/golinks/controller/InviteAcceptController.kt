package com.golinks.golinks.controller

import com.golinks.golinks.dto.AcceptInviteRequest
import com.golinks.golinks.service.WorkspaceInviteService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/invites")
class InviteAcceptController(
    private val inviteService: WorkspaceInviteService
) {

    @GetMapping("/validate")
    fun validateInvite(
        @RequestParam token: String
    ): ResponseEntity<*> {
        return ResponseEntity.ok(inviteService.validateInviteToken(token))
    }

    @PostMapping("/accept")
    fun acceptInvite(
        @Valid @RequestBody request: AcceptInviteRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(inviteService.acceptInvite(request.token, userId))
    }
}

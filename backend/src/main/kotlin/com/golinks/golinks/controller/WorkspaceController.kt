package com.golinks.golinks.controller

import com.golinks.golinks.dto.CreateWorkspaceRequest
import com.golinks.golinks.dto.UpdateWorkspaceRequest
import com.golinks.golinks.service.WorkspaceService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*
import java.util.UUID

@RestController
@RequestMapping("/api/v1/workspaces")
class WorkspaceController(
    private val workspaceService: WorkspaceService
) {

    @PostMapping
    fun createWorkspace(
        @Valid @RequestBody request: CreateWorkspaceRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        val workspace = workspaceService.createWorkspace(request, userId)
        return ResponseEntity.status(HttpStatus.CREATED).body(workspace)
    }

    @GetMapping
    fun getUserWorkspaces(
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(workspaceService.getUserWorkspaces(userId))
    }

    @GetMapping("/{id}")
    fun getWorkspace(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(workspaceService.getWorkspace(id, userId))
    }

    @PutMapping("/{id}")
    fun updateWorkspace(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateWorkspaceRequest,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(workspaceService.updateWorkspace(id, request, userId))
    }

    @DeleteMapping("/{id}")
    fun deleteWorkspace(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        workspaceService.deleteWorkspace(id, userId)
        return ResponseEntity.noContent().build<Any>()
    }

    @GetMapping("/{id}/me")
    fun validateMembership(
        @PathVariable id: UUID,
        @AuthenticationPrincipal principal: UserDetails
    ): ResponseEntity<*> {
        val userId = UUID.fromString(principal.username)
        return ResponseEntity.ok(workspaceService.validateMembership(id, userId))
    }

    @GetMapping("/check-slug/{slug}")
    fun checkSlug(
        @PathVariable slug: String
    ): ResponseEntity<*> {
        return ResponseEntity.ok(workspaceService.checkSlugAvailability(slug))
    }
}

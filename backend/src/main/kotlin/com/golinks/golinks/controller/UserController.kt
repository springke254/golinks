package com.golinks.golinks.controller

import com.golinks.golinks.dto.*
import com.golinks.golinks.service.UserService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/v1/users")
class UserController(
    private val userService: UserService
) {

    @GetMapping("/me")
    fun getCurrentUser(): ResponseEntity<UserResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(userService.getCurrentUser(userId))
    }

    @PutMapping("/me")
    fun updateProfile(@Valid @RequestBody request: UpdateProfileRequest): ResponseEntity<UserResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(userService.updateProfile(userId, request))
    }

    @GetMapping("/me/sessions")
    fun getActiveSessions(
        @CookieValue("refresh_token", required = false) refreshToken: String?
    ): ResponseEntity<List<SessionResponse>> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(userService.getActiveSessions(userId, refreshToken))
    }

    @DeleteMapping("/me/sessions/{sessionId}")
    fun revokeSession(@PathVariable sessionId: UUID): ResponseEntity<MessageResponse> {
        val userId = getCurrentUserId()
        userService.revokeSession(userId, sessionId)
        return ResponseEntity.ok(MessageResponse("Session revoked successfully"))
    }

    @GetMapping("/me/linked-accounts")
    fun getLinkedAccounts(): ResponseEntity<List<OAuthAccountResponse>> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(userService.getLinkedAccounts(userId))
    }

    private fun getCurrentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
        val username = (authentication.principal as org.springframework.security.core.userdetails.UserDetails).username
        return UUID.fromString(username)
    }
}

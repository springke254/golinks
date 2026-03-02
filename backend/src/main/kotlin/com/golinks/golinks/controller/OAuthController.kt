package com.golinks.golinks.controller

import com.golinks.golinks.dto.LinkOAuthRequest
import com.golinks.golinks.dto.MessageResponse
import com.golinks.golinks.dto.OAuthAccountResponse
import com.golinks.golinks.service.OAuthService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/v1/auth/oauth")
class OAuthController(
    private val oauthService: OAuthService
) {

    @GetMapping("/accounts")
    fun getLinkedAccounts(): ResponseEntity<List<OAuthAccountResponse>> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(oauthService.getLinkedAccounts(userId))
    }

    @PostMapping("/link")
    fun linkProvider(@Valid @RequestBody request: LinkOAuthRequest): ResponseEntity<OAuthAccountResponse> {
        val userId = getCurrentUserId()
        val result = oauthService.linkProvider(
            userId = userId,
            provider = request.provider,
            providerUserId = "placeholder", // In real implementation, validate the provider token
            providerEmail = null,
            profileMetadata = null
        )
        return ResponseEntity.status(HttpStatus.CREATED).body(result)
    }

    @DeleteMapping("/unlink/{provider}")
    fun unlinkProvider(@PathVariable provider: String): ResponseEntity<MessageResponse> {
        val userId = getCurrentUserId()
        oauthService.unlinkProvider(userId, provider)
        return ResponseEntity.ok(MessageResponse("Provider $provider unlinked successfully"))
    }

    private fun getCurrentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
        val username = (authentication.principal as org.springframework.security.core.userdetails.UserDetails).username
        return UUID.fromString(username)
    }
}

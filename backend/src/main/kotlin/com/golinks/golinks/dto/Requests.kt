package com.golinks.golinks.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class SignupRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Invalid email format")
    val email: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(min = 8, message = "Password must be at least 8 characters")
    val password: String,

    @field:NotBlank(message = "Display name is required")
    @field:Size(min = 2, max = 100, message = "Display name must be between 2 and 100 characters")
    val displayName: String
)

data class LoginRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Invalid email format")
    val email: String,

    @field:NotBlank(message = "Password is required")
    val password: String
)

data class ForgotPasswordRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Invalid email format")
    val email: String
)

data class ResetPasswordRequest(
    @field:NotBlank(message = "Token is required")
    val token: String,

    @field:NotBlank(message = "New password is required")
    @field:Size(min = 8, message = "Password must be at least 8 characters")
    val newPassword: String
)

data class UpdateProfileRequest(
    @field:Size(min = 2, max = 100, message = "Display name must be between 2 and 100 characters")
    val displayName: String? = null,

    @field:Size(max = 500, message = "Avatar URL must be at most 500 characters")
    val avatarUrl: String? = null
)

data class LinkOAuthRequest(
    @field:NotBlank(message = "Provider is required")
    val provider: String,

    @field:NotBlank(message = "Provider access token is required")
    val providerAccessToken: String
)

data class CreateLinkRequest(
    @field:NotBlank(message = "Destination URL is required")
    val destinationUrl: String,

    @field:Size(min = 3, max = 50, message = "Slug must be between 3 and 50 characters")
    val slug: String? = null,

    @field:Size(max = 255, message = "Title must be at most 255 characters")
    val title: String? = null,

    val tags: List<String>? = null,

    @field:Size(min = 4, message = "Password must be at least 4 characters")
    val password: String? = null,

    val isPrivate: Boolean? = null,

    val isOneTime: Boolean? = null,

    val expiresAt: String? = null,

    val maxClicks: Int? = null
)

data class UpdateLinkRequest(
    val destinationUrl: String? = null,

    @field:Size(min = 3, max = 50, message = "Slug must be between 3 and 50 characters")
    val slug: String? = null,

    @field:Size(max = 255, message = "Title must be at most 255 characters")
    val title: String? = null,

    val tags: List<String>? = null,

    val isActive: Boolean? = null,

    @field:Size(min = 4, message = "Password must be at least 4 characters")
    val password: String? = null,

    val removePassword: Boolean? = null,

    val isPrivate: Boolean? = null,

    val isOneTime: Boolean? = null,

    val expiresAt: String? = null,

    val maxClicks: Int? = null
)

data class BulkDeleteRequest(
    val ids: List<java.util.UUID>
)

data class PasswordChallengeRequest(
    @field:NotBlank(message = "Password is required")
    val password: String
)

// ── Workspace ────────────────────────────────────────────

data class CreateWorkspaceRequest(
    @field:NotBlank(message = "Workspace name is required")
    @field:Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    val name: String,

    @field:NotBlank(message = "Slug is required")
    @field:Size(min = 3, max = 50, message = "Slug must be between 3 and 50 characters")
    @field:jakarta.validation.constraints.Pattern(
        regexp = "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        message = "Slug must contain only lowercase letters, numbers, and hyphens"
    )
    val slug: String,

    @field:Size(max = 500, message = "Description must be at most 500 characters")
    val description: String? = null
)

data class UpdateWorkspaceRequest(
    @field:Size(min = 3, max = 100, message = "Name must be between 3 and 100 characters")
    val name: String? = null,

    @field:Size(min = 3, max = 50, message = "Slug must be between 3 and 50 characters")
    val slug: String? = null,

    @field:Size(max = 500, message = "Description must be at most 500 characters")
    val description: String? = null,

    @field:Size(max = 500, message = "Avatar URL must be at most 500 characters")
    val avatarUrl: String? = null
)

data class CreateInviteRequest(
    @field:NotBlank(message = "Email is required")
    @field:Email(message = "Invalid email format")
    val email: String,

    @field:NotBlank(message = "Role is required")
    val role: String = "MEMBER"
)

data class AcceptInviteRequest(
    @field:NotBlank(message = "Token is required")
    val token: String
)

data class UpdateMemberRoleRequest(
    @field:NotBlank(message = "Role is required")
    val role: String
)

package com.golinks.golinks.dto

import java.time.Instant
import java.util.UUID

data class TokenResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long
)

data class UserResponse(
    val id: UUID,
    val email: String,
    val displayName: String,
    val avatarUrl: String?,
    val emailVerified: Boolean,
    val linkedProviders: List<String>,
    val createdAt: Instant
)

data class SessionResponse(
    val id: UUID,
    val userAgent: String?,
    val ipAddress: String?,
    val createdAt: Instant,
    val lastUsedAt: Instant,
    val current: Boolean
)

data class OAuthAccountResponse(
    val provider: String,
    val providerEmail: String?,
    val linkedAt: Instant
)

data class ApiErrorResponse(
    val status: Int,
    val message: String,
    val errors: List<FieldError> = emptyList()
)

data class FieldError(
    val field: String,
    val message: String
)

data class MessageResponse(
    val message: String
)

data class LinkResponse(
    val id: UUID,
    val slug: String,
    val destinationUrl: String,
    val title: String?,
    val tags: List<TagResponse>,
    val clicksCount: Long,
    val isActive: Boolean,
    val isPasswordProtected: Boolean,
    val isPrivate: Boolean,
    val isOneTime: Boolean,
    val expiresAt: Instant?,
    val maxClicks: Int?,
    val createdAt: Instant,
    val updatedAt: Instant,
    val shortUrl: String
)

data class TagResponse(
    val id: UUID,
    val name: String
)

data class PaginatedLinksResponse(
    val items: List<LinkResponse>,
    val nextCursor: String?,
    val totalCount: Long,
    val hasMore: Boolean,
    val page: Int = 0,
    val pageSize: Int = 20,
    val totalPages: Int = 0
)

data class LinkStatsResponse(
    val totalLinks: Long,
    val totalClicks: Long,
    val activeLinks: Long
)

data class BulkOperationResponse(
    val successCount: Int,
    val message: String
)

data class SlugCheckResponse(
    val available: Boolean,
    val suggestions: List<String>
)

data class BulkImportOperationResponse(
    val id: UUID,
    val status: String,
    val totalRows: Int,
    val processedRows: Int,
    val successCount: Int,
    val errorCount: Int,
    val results: List<BulkRowResult>?
)

data class BulkRowResult(
    val row: Int,
    val success: Boolean,
    val slug: String?,
    val error: String?
)

// ── Analytics ────────────────────────────────────────────

data class AnalyticsSummaryResponse(
    val totalClicks: Long,
    val uniqueVisitors: Long,
    val topLinkSlug: String?,
    val topLinkTitle: String?,
    val avgClicksPerDay: Double,
    val periodFrom: Instant,
    val periodTo: Instant
)

data class DailyClicksResponse(
    val date: String,
    val clicks: Long
)

data class TimeSeriesResponse(
    val data: List<DailyClicksResponse>
)

data class ReferrerResponse(
    val referrer: String,
    val count: Long
)

data class TopLinkResponse(
    val slug: String,
    val title: String?,
    val clicks: Long
)

// ── Audit ────────────────────────────────────────────────

data class AuditLogResponse(
    val id: UUID,
    val userId: UUID,
    val shortUrlId: UUID?,
    val action: String,
    val resourceType: String,
    val details: String?,
    val ipAddress: String?,
    val userAgent: String?,
    val createdAt: Instant
)

data class PaginatedAuditLogsResponse(
    val items: List<AuditLogResponse>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Long,
    val totalPages: Int
)

data class AuditActionsResponse(
    val actions: List<String>,
    val resourceTypes: List<String>
)

// ── Workspace ────────────────────────────────────────────

data class WorkspaceResponse(
    val id: UUID,
    val name: String,
    val slug: String,
    val description: String?,
    val avatarUrl: String?,
    val memberCount: Long,
    val role: String,
    val createdAt: Instant
)

data class WorkspaceMeResponse(
    val workspaceId: UUID,
    val slug: String,
    val role: String,
    val permissions: Set<String>
)

data class WorkspaceMemberResponse(
    val userId: UUID,
    val email: String,
    val displayName: String,
    val avatarUrl: String?,
    val role: String,
    val joinedAt: Instant
)

data class PaginatedMembersResponse(
    val items: List<WorkspaceMemberResponse>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Long,
    val totalPages: Int
)

data class InviteResponse(
    val id: UUID,
    val email: String,
    val role: String,
    val expiresAt: Instant,
    val createdAt: Instant,
    val status: String
)

data class PaginatedInvitesResponse(
    val items: List<InviteResponse>,
    val page: Int,
    val pageSize: Int,
    val totalItems: Long,
    val totalPages: Int
)

data class InviteValidationResponse(
    val valid: Boolean,
    val workspaceName: String?,
    val workspaceSlug: String?,
    val inviterName: String?,
    val role: String?,
    val email: String?,
    val error: String? = null,
    val errorCode: String? = null
)

data class SlugAvailabilityResponse(
    val available: Boolean
)

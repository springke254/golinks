package com.golinks.golinks.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.golinks.golinks.dto.AuditActionsResponse
import com.golinks.golinks.dto.AuditLogResponse
import com.golinks.golinks.dto.PaginatedAuditLogsResponse
import com.golinks.golinks.entity.LinkAuditLog
import com.golinks.golinks.repository.LinkAuditLogRepository
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class AuditService(
    private val linkAuditLogRepository: LinkAuditLogRepository,
    private val objectMapper: ObjectMapper
) {

    private val logger = LoggerFactory.getLogger(AuditService::class.java)
    private val auditLogger = LoggerFactory.getLogger("AUDIT")

    /**
     * Record an audit event — persists to DB and writes to the structured AUDIT log.
     */
    @Transactional
    fun record(
        userId: UUID,
        action: String,
        resourceType: String = "LINK",
        shortUrlId: UUID? = null,
        details: Map<String, Any?>? = null,
        ipAddress: String? = null,
        userAgent: String? = null
    ) {
        val detailsJson = details?.let {
            try {
                objectMapper.writeValueAsString(it)
            } catch (ex: Exception) {
                logger.warn("Failed to serialize audit details: ${ex.message}")
                null
            }
        }

        val entry = LinkAuditLog(
            userId = userId,
            shortUrlId = shortUrlId,
            action = action,
            resourceType = resourceType,
            details = detailsJson,
            ipAddress = ipAddress,
            userAgent = userAgent
        )

        linkAuditLogRepository.save(entry)

        // Structured audit log line
        auditLogger.info(
            "action={} resource={} userId={} resourceId={} ip={} details={}",
            action,
            resourceType,
            userId,
            shortUrlId ?: "-",
            ipAddress ?: "-",
            detailsJson ?: "{}"
        )
    }

    /**
     * Search / paginate audit logs with optional filters.
     */
    @Transactional(readOnly = true)
    fun search(
        action: String?,
        resourceType: String?,
        userId: UUID?,
        from: Instant?,
        to: Instant?,
        page: Int,
        size: Int
    ): PaginatedAuditLogsResponse {
        val pageable = PageRequest.of(page, size.coerceIn(1, 100))
        val result = linkAuditLogRepository.search(action, resourceType, userId, from, to, pageable)

        return PaginatedAuditLogsResponse(
            items = result.content.map { toResponse(it) },
            page = result.number,
            pageSize = result.size,
            totalItems = result.totalElements,
            totalPages = result.totalPages
        )
    }

    /**
     * Return the distinct action names and resource types currently in the audit log.
     */
    @Transactional(readOnly = true)
    fun getActions(): AuditActionsResponse {
        return AuditActionsResponse(
            actions = linkAuditLogRepository.findDistinctActions(),
            resourceTypes = linkAuditLogRepository.findDistinctResourceTypes()
        )
    }

    private fun toResponse(log: LinkAuditLog): AuditLogResponse {
        return AuditLogResponse(
            id = log.id!!,
            userId = log.userId,
            shortUrlId = log.shortUrlId,
            action = log.action,
            resourceType = log.resourceType,
            details = log.details,
            ipAddress = log.ipAddress,
            userAgent = log.userAgent,
            createdAt = log.createdAt
        )
    }
}

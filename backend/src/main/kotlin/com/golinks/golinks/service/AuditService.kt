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

    companion object {
        private val MIN_AUDIT_INSTANT: Instant = Instant.EPOCH
        private val MAX_AUDIT_INSTANT: Instant = Instant.parse("9999-12-31T23:59:59Z")
    }

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
        val detailsNode = details?.let {
            try {
                objectMapper.valueToTree(it)
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
            details = detailsNode,
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
            detailsNode?.toString() ?: "{}"
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
        val effectiveFrom = from ?: MIN_AUDIT_INSTANT
        val effectiveTo = to ?: MAX_AUDIT_INSTANT
        val result = linkAuditLogRepository.search(
            action = action,
            resourceType = resourceType,
            userId = userId,
            from = effectiveFrom,
            to = effectiveTo,
            pageable = pageable
        )

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
            details = log.details?.toString(),
            ipAddress = log.ipAddress,
            userAgent = log.userAgent,
            createdAt = log.createdAt
        )
    }
}

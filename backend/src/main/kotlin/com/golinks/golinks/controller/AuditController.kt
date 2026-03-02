package com.golinks.golinks.controller

import com.golinks.golinks.dto.AuditActionsResponse
import com.golinks.golinks.dto.PaginatedAuditLogsResponse
import com.golinks.golinks.service.AuditService
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/audit")
class AuditController(
    private val auditService: AuditService
) {

    @GetMapping
    fun getAuditLogs(
        @RequestParam(required = false) action: String?,
        @RequestParam(required = false) resourceType: String?,
        @RequestParam(required = false) userId: UUID?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) from: Instant?,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) to: Instant?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<PaginatedAuditLogsResponse> {
        val result = auditService.search(action, resourceType, userId, from, to, page, size)
        return ResponseEntity.ok(result)
    }

    @GetMapping("/actions")
    fun getAuditActions(): ResponseEntity<AuditActionsResponse> {
        return ResponseEntity.ok(auditService.getActions())
    }
}

package com.golinks.golinks.repository

import com.golinks.golinks.entity.LinkAuditLog
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
interface LinkAuditLogRepository : JpaRepository<LinkAuditLog, UUID> {

    @Query("""
        SELECT l FROM LinkAuditLog l
        WHERE (:action IS NULL OR l.action = :action)
          AND (:resourceType IS NULL OR l.resourceType = :resourceType)
          AND (:userId IS NULL OR l.userId = :userId)
          AND (:from IS NULL OR l.createdAt >= :from)
          AND (:to IS NULL OR l.createdAt <= :to)
        ORDER BY l.createdAt DESC
    """)
    fun search(
        action: String?,
        resourceType: String?,
        userId: UUID?,
        from: Instant?,
        to: Instant?,
        pageable: Pageable
    ): Page<LinkAuditLog>

    @Query("SELECT DISTINCT l.action FROM LinkAuditLog l ORDER BY l.action")
    fun findDistinctActions(): List<String>

    @Query("SELECT DISTINCT l.resourceType FROM LinkAuditLog l ORDER BY l.resourceType")
    fun findDistinctResourceTypes(): List<String>
}

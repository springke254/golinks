package com.golinks.golinks.repository

import com.golinks.golinks.entity.LinkAuditLog
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
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
          AND l.createdAt >= :fromTs
          AND l.createdAt <= :toTs
        ORDER BY l.createdAt DESC
    """)
    fun search(
        @Param("action") action: String?,
        @Param("resourceType") resourceType: String?,
        @Param("userId") userId: UUID?,
        @Param("fromTs") from: Instant,
        @Param("toTs") to: Instant,
        pageable: Pageable
    ): Page<LinkAuditLog>

    @Query("SELECT DISTINCT l.action FROM LinkAuditLog l ORDER BY l.action")
    fun findDistinctActions(): List<String>

    @Query("SELECT DISTINCT l.resourceType FROM LinkAuditLog l ORDER BY l.resourceType")
    fun findDistinctResourceTypes(): List<String>
}

package com.golinks.golinks.repository

import com.golinks.golinks.entity.AnalyticsSessionSummary
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Repository
interface AnalyticsSessionSummaryRepository : JpaRepository<AnalyticsSessionSummary, UUID> {

    @Query(
        """
            SELECT s
            FROM AnalyticsSessionSummary s
            WHERE s.ownerUserId = :userId
              AND s.sessionStart >= :fromDate
              AND s.sessionStart <= :toDate
            ORDER BY s.sessionStart DESC
        """
    )
    fun findByOwnerAndRange(
        userId: UUID,
        fromDate: Instant,
        toDate: Instant,
        pageable: Pageable
    ): Page<AnalyticsSessionSummary>

    fun findByIdAndOwnerUserId(id: UUID, ownerUserId: UUID): AnalyticsSessionSummary?

    @Modifying
    @Transactional
    @Query(
        """
            DELETE FROM AnalyticsSessionSummary s
            WHERE s.sessionEnd >= :fromDate
              AND s.sessionStart <= :toDate
        """
    )
    fun deleteOverlappingRange(fromDate: Instant, toDate: Instant): Int

    @Query("SELECT MAX(s.createdAt) FROM AnalyticsSessionSummary s WHERE s.ownerUserId = :userId")
    fun findLastUpdatedAtByOwnerUserId(userId: UUID): Instant?
}

package com.golinks.golinks.repository

import com.golinks.golinks.entity.ShortUrl
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.UUID

@Repository
interface ShortUrlRepository : JpaRepository<ShortUrl, UUID>, JpaSpecificationExecutor<ShortUrl> {

    fun findBySlug(slug: String): ShortUrl?

    fun existsBySlug(slug: String): Boolean

    fun findByIdAndUserIdAndDeletedFalse(id: UUID, userId: UUID): ShortUrl?

    @Query("""
        SELECT s FROM ShortUrl s 
        WHERE s.slug = :slug 
          AND s.deleted = false
    """)
    fun findBySlugAndDeletedFalse(slug: String): ShortUrl?

    @Query("""
        SELECT s FROM ShortUrl s 
        WHERE s.user.id = :userId 
          AND s.deleted = false 
          AND s.createdAt < :cursor 
        ORDER BY s.createdAt DESC
    """)
    fun findByUserWithCursor(userId: UUID, cursor: Instant, pageable: Pageable): List<ShortUrl>

    @Query("""
        SELECT s FROM ShortUrl s 
        WHERE s.user.id = :userId 
          AND s.deleted = false 
        ORDER BY s.createdAt DESC
    """)
    fun findByUserNoCursor(userId: UUID, pageable: Pageable): List<ShortUrl>

    fun countByUserIdAndDeletedFalse(userId: UUID): Long

    @Query("SELECT s.slug FROM ShortUrl s WHERE s.user.id = :userId AND s.deleted = false")
    fun findAllSlugsByUserId(userId: UUID): List<String>

    fun countByUserIdAndDeletedFalseAndIsActiveTrue(userId: UUID): Long

    @Query("SELECT COALESCE(SUM(s.clicksCount), 0) FROM ShortUrl s WHERE s.user.id = :userId AND s.deleted = false")
    fun sumClicksByUserId(userId: UUID): Long

    @Modifying
    @Query("""
        UPDATE ShortUrl s 
        SET s.deleted = true, s.deletedAt = :now 
        WHERE s.id IN :ids AND s.user.id = :userId AND s.deleted = false
    """)
    fun bulkSoftDelete(ids: List<UUID>, userId: UUID, now: Instant): Int

    @Query("""
        SELECT s FROM ShortUrl s 
        WHERE s.user.id = :userId 
          AND s.deleted = false
          AND (
            LOWER(s.slug) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(s.destinationUrl) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(s.title) LIKE LOWER(CONCAT('%', :search, '%'))
          )
        ORDER BY s.createdAt DESC
    """)
    fun searchByUser(userId: UUID, search: String, pageable: Pageable): List<ShortUrl>

    @Query("""
        SELECT COUNT(s) FROM ShortUrl s 
        WHERE s.user.id = :userId 
          AND s.deleted = false
          AND (
            LOWER(s.slug) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(s.destinationUrl) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(s.title) LIKE LOWER(CONCAT('%', :search, '%'))
          )
    """)
    fun countSearchByUser(userId: UUID, search: String): Long

    @Modifying
    @Query("UPDATE ShortUrl s SET s.clicksCount = s.clicksCount + 1 WHERE s.slug = :slug")
    fun incrementClickCount(slug: String): Int

    @Modifying
    @Query("""
        UPDATE ShortUrl s 
        SET s.isActive = false, s.deleted = true, s.deletedAt = :now 
        WHERE s.slug = :slug AND s.isActive = true AND s.isOneTime = true AND s.deleted = false
    """)
    fun atomicConsumeOneTimeLink(slug: String, now: Instant): Int
}

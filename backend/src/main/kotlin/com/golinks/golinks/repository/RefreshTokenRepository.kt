package com.golinks.golinks.repository

import com.golinks.golinks.entity.RefreshToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface RefreshTokenRepository : JpaRepository<RefreshToken, UUID> {
    fun findByTokenHash(tokenHash: String): RefreshToken?

    fun findAllByUserIdAndRevokedFalse(userId: UUID): List<RefreshToken>

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.user.id = :userId")
    fun revokeAllByUserId(userId: UUID): Int

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true WHERE rt.id = :tokenId AND rt.user.id = :userId")
    fun revokeByIdAndUserId(tokenId: UUID, userId: UUID): Int

    fun countByUserIdAndRevokedFalse(userId: UUID): Long
}

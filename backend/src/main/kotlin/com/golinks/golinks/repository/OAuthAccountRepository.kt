package com.golinks.golinks.repository

import com.golinks.golinks.entity.OAuthAccount
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface OAuthAccountRepository : JpaRepository<OAuthAccount, UUID> {
    fun findByProviderAndProviderUserId(provider: String, providerUserId: String): OAuthAccount?
    fun findAllByUserId(userId: UUID): List<OAuthAccount>
    fun findByUserIdAndProvider(userId: UUID, provider: String): OAuthAccount?
    fun countByUserId(userId: UUID): Long
    fun deleteByUserIdAndProvider(userId: UUID, provider: String)
}

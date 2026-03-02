package com.golinks.golinks.repository

import com.golinks.golinks.entity.EmailVerificationToken
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface EmailVerificationTokenRepository : JpaRepository<EmailVerificationToken, UUID> {
    fun findByTokenHash(tokenHash: String): EmailVerificationToken?
}

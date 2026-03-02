package com.golinks.golinks.service

import com.golinks.golinks.config.JwtConfig
import com.golinks.golinks.entity.RefreshToken
import com.golinks.golinks.entity.User
import com.golinks.golinks.exception.InvalidTokenException
import com.golinks.golinks.exception.TokenReusedException
import com.golinks.golinks.repository.RefreshTokenRepository
import com.golinks.golinks.security.JwtTokenProvider
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.security.MessageDigest
import java.time.Instant
import java.util.*

@Service
class TokenService(
    private val jwtTokenProvider: JwtTokenProvider,
    private val refreshTokenRepository: RefreshTokenRepository,
    private val jwtConfig: JwtConfig
) {

    private val logger = LoggerFactory.getLogger(TokenService::class.java)

    fun generateAccessToken(user: User): String {
        return jwtTokenProvider.generateAccessToken(user.id!!, user.email)
    }

    fun getAccessTokenExpirationMs(): Long = jwtConfig.accessTokenExpirationMs

    @Transactional
    fun createRefreshToken(user: User, userAgent: String?, ipAddress: String?): String {
        val rawToken = UUID.randomUUID().toString()
        val tokenHash = hashToken(rawToken)
        val expiresAt = Instant.now().plusMillis(jwtConfig.refreshTokenExpirationMs)

        val refreshToken = RefreshToken(
            user = user,
            tokenHash = tokenHash,
            userAgent = userAgent,
            ipAddress = ipAddress,
            expiresAt = expiresAt
        )
        refreshTokenRepository.save(refreshToken)

        return rawToken
    }

    @Transactional
    fun rotateRefreshToken(rawToken: String, userAgent: String?, ipAddress: String?): Pair<String, RefreshToken> {
        val tokenHash = hashToken(rawToken)
        val existingToken = refreshTokenRepository.findByTokenHash(tokenHash)
            ?: throw InvalidTokenException("Refresh token not found")

        // Reuse detection: if the token is already revoked, someone is replaying it
        if (existingToken.revoked) {
            logger.warn("Refresh token reuse detected for user ${existingToken.user.id}. Revoking all sessions.")
            refreshTokenRepository.revokeAllByUserId(existingToken.user.id!!)
            throw TokenReusedException()
        }

        if (existingToken.isExpired()) {
            throw InvalidTokenException("Refresh token expired")
        }

        // Revoke the old token
        existingToken.revoked = true
        existingToken.lastUsedAt = Instant.now()
        refreshTokenRepository.save(existingToken)

        // Issue a new refresh token
        val newRawToken = UUID.randomUUID().toString()
        val newTokenHash = hashToken(newRawToken)
        val newExpiresAt = Instant.now().plusMillis(jwtConfig.refreshTokenExpirationMs)

        val newRefreshToken = RefreshToken(
            user = existingToken.user,
            tokenHash = newTokenHash,
            userAgent = userAgent,
            ipAddress = ipAddress,
            expiresAt = newExpiresAt
        )
        refreshTokenRepository.save(newRefreshToken)

        return Pair(newRawToken, newRefreshToken)
    }

    @Transactional
    fun revokeRefreshToken(rawToken: String) {
        val tokenHash = hashToken(rawToken)
        val token = refreshTokenRepository.findByTokenHash(tokenHash)
        if (token != null) {
            token.revoked = true
            refreshTokenRepository.save(token)
        }
    }

    @Transactional
    fun revokeAllUserTokens(userId: UUID) {
        refreshTokenRepository.revokeAllByUserId(userId)
    }

    @Transactional
    fun revokeSessionById(sessionId: UUID, userId: UUID) {
        refreshTokenRepository.revokeByIdAndUserId(sessionId, userId)
    }

    fun getActiveSessions(userId: UUID): List<RefreshToken> {
        return refreshTokenRepository.findAllByUserIdAndRevokedFalse(userId)
            .filter { !it.isExpired() }
    }

    fun findRefreshTokenByRawToken(rawToken: String): RefreshToken? {
        val tokenHash = hashToken(rawToken)
        return refreshTokenRepository.findByTokenHash(tokenHash)
    }

    fun hashToken(rawToken: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hashBytes = digest.digest(rawToken.toByteArray())
        return Base64.getEncoder().encodeToString(hashBytes)
    }

    fun validateAccessToken(token: String): Boolean = jwtTokenProvider.validateToken(token)

    fun getUserIdFromAccessToken(token: String): UUID = jwtTokenProvider.getUserIdFromToken(token)
}

package com.golinks.golinks.service

import com.golinks.golinks.dto.OAuthAccountResponse
import com.golinks.golinks.dto.SessionResponse
import com.golinks.golinks.dto.UpdateProfileRequest
import com.golinks.golinks.dto.UserResponse
import com.golinks.golinks.exception.UserNotFoundException
import com.golinks.golinks.repository.OAuthAccountRepository
import com.golinks.golinks.repository.UserRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class UserService(
    private val userRepository: UserRepository,
    private val oauthAccountRepository: OAuthAccountRepository,
    private val tokenService: TokenService,
    private val authService: AuthService
) {

    @Transactional(readOnly = true)
    fun getCurrentUser(userId: UUID): UserResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }
        return authService.toUserResponse(user)
    }

    @Transactional
    fun updateProfile(userId: UUID, request: UpdateProfileRequest): UserResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        request.displayName?.let { user.displayName = it.trim() }
        request.avatarUrl?.let { user.avatarUrl = it.trim() }

        val savedUser = userRepository.save(user)
        return authService.toUserResponse(savedUser)
    }

    fun getActiveSessions(userId: UUID, currentRefreshToken: String?): List<SessionResponse> {
        val currentTokenHash = currentRefreshToken
            ?.takeIf { it.isNotBlank() }
            ?.let { tokenService.hashToken(it) }

        val sessions = tokenService.getActiveSessions(userId)
        return sessions.map { token ->
            SessionResponse(
                id = token.id!!,
                userAgent = token.userAgent,
                ipAddress = token.ipAddress,
                createdAt = token.createdAt,
                lastUsedAt = token.lastUsedAt,
                current = currentTokenHash != null && token.tokenHash == currentTokenHash
            )
        }
    }

    @Transactional
    fun revokeSession(userId: UUID, sessionId: UUID) {
        tokenService.revokeSessionById(sessionId, userId)
    }

    fun getLinkedAccounts(userId: UUID): List<OAuthAccountResponse> {
        return oauthAccountRepository.findAllByUserId(userId).map { account ->
            OAuthAccountResponse(
                provider = account.provider,
                providerEmail = account.providerEmail,
                linkedAt = account.createdAt
            )
        }
    }
}

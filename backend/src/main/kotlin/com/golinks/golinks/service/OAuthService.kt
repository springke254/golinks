package com.golinks.golinks.service

import com.golinks.golinks.dto.OAuthAccountResponse
import com.golinks.golinks.entity.OAuthAccount
import com.golinks.golinks.entity.User
import com.golinks.golinks.exception.AuthMethodRequiredException
import com.golinks.golinks.exception.DuplicateEmailException
import com.golinks.golinks.exception.OAuthProviderException
import com.golinks.golinks.exception.UserNotFoundException
import com.golinks.golinks.repository.OAuthAccountRepository
import com.golinks.golinks.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.*

@Service
class OAuthService(
    private val userRepository: UserRepository,
    private val oauthAccountRepository: OAuthAccountRepository,
    private val tokenService: TokenService
) {

    private val logger = LoggerFactory.getLogger(OAuthService::class.java)

    /**
     * Find or create a user based on OAuth provider info.
     * Returns the user and whether this was a new account.
     */
    @Transactional
    fun findOrCreateUser(
        provider: String,
        providerUserId: String,
        email: String?,
        displayName: String?,
        avatarUrl: String?,
        profileMetadata: String?
    ): Pair<User, Boolean> {
        // Check if the OAuth account already exists
        val existingOAuth = oauthAccountRepository.findByProviderAndProviderUserId(provider, providerUserId)
        if (existingOAuth != null) {
            return Pair(existingOAuth.user, false)
        }

        // Check if a user with the same email already exists
        val existingUser = email?.let { userRepository.findByEmail(it.lowercase().trim()) }

        val user = if (existingUser != null) {
            // Link OAuth to existing user
            existingUser
        } else {
            // Create new user
            if (email == null) {
                throw OAuthProviderException("Email is required from OAuth provider")
            }
            val newUser = User(
                email = email.lowercase().trim(),
                displayName = displayName ?: email.substringBefore("@"),
                avatarUrl = avatarUrl,
                emailVerified = true // OAuth-verified emails are trusted
            )
            try {
                userRepository.save(newUser)
            } catch (ex: Exception) {
                throw DuplicateEmailException()
            }
        }

        // Create the OAuth account link
        val oauthAccount = OAuthAccount(
            user = user,
            provider = provider,
            providerUserId = providerUserId,
            providerEmail = email,
            profileMetadata = profileMetadata
        )
        oauthAccountRepository.save(oauthAccount)

        logger.info("OAuth account linked: provider=$provider, userId=${user.id}")

        return Pair(user, existingUser == null)
    }

    @Transactional
    fun linkProvider(
        userId: UUID,
        provider: String,
        providerUserId: String,
        providerEmail: String?,
        profileMetadata: String?
    ): OAuthAccountResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        // Check if already linked
        val existing = oauthAccountRepository.findByUserIdAndProvider(userId, provider)
        if (existing != null) {
            throw OAuthProviderException("Provider $provider is already linked to your account")
        }

        // Check if another user already has this OAuth account
        val otherOAuth = oauthAccountRepository.findByProviderAndProviderUserId(provider, providerUserId)
        if (otherOAuth != null) {
            throw OAuthProviderException("This $provider account is already linked to another user")
        }

        val oauthAccount = OAuthAccount(
            user = user,
            provider = provider,
            providerUserId = providerUserId,
            providerEmail = providerEmail,
            profileMetadata = profileMetadata
        )
        val saved = oauthAccountRepository.save(oauthAccount)

        logger.info("OAuth provider linked: provider=$provider, userId=$userId")

        return OAuthAccountResponse(
            provider = saved.provider,
            providerEmail = saved.providerEmail,
            linkedAt = saved.createdAt
        )
    }

    @Transactional
    fun unlinkProvider(userId: UUID, provider: String) {
        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        // Ensure at least one auth method remains
        val oauthCount = oauthAccountRepository.countByUserId(userId)
        val hasPassword = user.passwordHash != null

        if (oauthCount <= 1 && !hasPassword) {
            throw AuthMethodRequiredException()
        }

        val existing = oauthAccountRepository.findByUserIdAndProvider(userId, provider)
            ?: throw OAuthProviderException("Provider $provider is not linked to your account")

        oauthAccountRepository.delete(existing)

        logger.info("OAuth provider unlinked: provider=$provider, userId=$userId")
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

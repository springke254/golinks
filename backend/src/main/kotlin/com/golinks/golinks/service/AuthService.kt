package com.golinks.golinks.service

import com.golinks.golinks.dto.*
import com.golinks.golinks.entity.EmailVerificationToken
import com.golinks.golinks.entity.PasswordResetToken
import com.golinks.golinks.entity.User
import com.golinks.golinks.exception.*
import com.golinks.golinks.messaging.NotificationProducer
import com.golinks.golinks.repository.EmailVerificationTokenRepository
import com.golinks.golinks.repository.PasswordResetTokenRepository
import com.golinks.golinks.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
    private val tokenService: TokenService,
    private val emailVerificationTokenRepository: EmailVerificationTokenRepository,
    private val passwordResetTokenRepository: PasswordResetTokenRepository,
    private val notificationProducer: NotificationProducer
) {

    private val logger = LoggerFactory.getLogger(AuthService::class.java)

    @Transactional
    fun register(request: SignupRequest): UserResponse {
        if (userRepository.existsByEmail(request.email)) {
            throw DuplicateEmailException()
        }

        val user = User(
            email = request.email.lowercase().trim(),
            passwordHash = passwordEncoder.encode(request.password),
            displayName = request.displayName.trim()
        )

        val savedUser = try {
            userRepository.save(user)
        } catch (ex: DataIntegrityViolationException) {
            throw DuplicateEmailException()
        }

        // Generate verification token
        val rawToken = UUID.randomUUID().toString()
        val tokenHash = tokenService.hashToken(rawToken)
        val verificationToken = EmailVerificationToken(
            user = savedUser,
            tokenHash = tokenHash,
            expiresAt = Instant.now().plusSeconds(86400) // 24 hours
        )
        emailVerificationTokenRepository.save(verificationToken)

        // Publish event for email notification
        notificationProducer.sendUserRegisteredEvent(savedUser.id!!, savedUser.email, rawToken)

        logger.info("User registered: ${savedUser.email}")

        return toUserResponse(savedUser)
    }

    @Transactional
    fun login(request: LoginRequest, userAgent: String?, ipAddress: String?): Pair<TokenResponse, String> {
        val user = userRepository.findByEmail(request.email.lowercase().trim())
            ?: throw InvalidCredentialsException()

        if (user.accountLocked) {
            throw AccountLockedException()
        }

        if (user.passwordHash == null || !passwordEncoder.matches(request.password, user.passwordHash)) {
            throw InvalidCredentialsException()
        }

        val accessToken = tokenService.generateAccessToken(user)
        val refreshToken = tokenService.createRefreshToken(user, userAgent, ipAddress)

        val tokenResponse = TokenResponse(
            accessToken = accessToken,
            expiresIn = tokenService.getAccessTokenExpirationMs() / 1000
        )

        return Pair(tokenResponse, refreshToken)
    }

    @Transactional
    fun refresh(rawRefreshToken: String, userAgent: String?, ipAddress: String?): Pair<TokenResponse, String> {
        val (newRawRefreshToken, newRefreshTokenEntity) = tokenService.rotateRefreshToken(
            rawRefreshToken, userAgent, ipAddress
        )

        val user = newRefreshTokenEntity.user
        val accessToken = tokenService.generateAccessToken(user)

        val tokenResponse = TokenResponse(
            accessToken = accessToken,
            expiresIn = tokenService.getAccessTokenExpirationMs() / 1000
        )

        return Pair(tokenResponse, newRawRefreshToken)
    }

    @Transactional
    fun logout(rawRefreshToken: String?) {
        if (rawRefreshToken != null) {
            tokenService.revokeRefreshToken(rawRefreshToken)
        }
    }

    @Transactional
    fun logoutAll(userId: UUID) {
        tokenService.revokeAllUserTokens(userId)
    }

    @Transactional
    fun verifyEmail(token: String): MessageResponse {
        val tokenHash = tokenService.hashToken(token)
        val verificationToken = emailVerificationTokenRepository.findByTokenHash(tokenHash)
            ?: throw InvalidTokenException("Invalid verification token")

        if (!verificationToken.isUsable()) {
            throw InvalidTokenException("Verification token expired or already used")
        }

        verificationToken.used = true
        emailVerificationTokenRepository.save(verificationToken)

        val user = verificationToken.user
        user.emailVerified = true
        userRepository.save(user)

        logger.info("Email verified for user: ${user.email}")

        return MessageResponse("Email verified successfully")
    }

    @Transactional
    fun forgotPassword(request: ForgotPasswordRequest): MessageResponse {
        val user = userRepository.findByEmail(request.email.lowercase().trim())

        // Always return success to prevent email enumeration
        if (user != null) {
            val rawToken = UUID.randomUUID().toString()
            val tokenHash = tokenService.hashToken(rawToken)
            val resetToken = PasswordResetToken(
                user = user,
                tokenHash = tokenHash,
                expiresAt = Instant.now().plusSeconds(3600) // 1 hour
            )
            passwordResetTokenRepository.save(resetToken)

            notificationProducer.sendPasswordResetEvent(user.id!!, user.email, rawToken)
        }

        return MessageResponse("If an account with that email exists, a password reset link has been sent")
    }

    @Transactional
    fun resetPassword(request: ResetPasswordRequest): MessageResponse {
        val tokenHash = tokenService.hashToken(request.token)
        val resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
            ?: throw InvalidTokenException("Invalid reset token")

        if (!resetToken.isUsable()) {
            throw InvalidTokenException("Reset token expired or already used")
        }

        resetToken.used = true
        passwordResetTokenRepository.save(resetToken)

        val user = resetToken.user
        user.passwordHash = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)

        // Revoke all sessions for security
        tokenService.revokeAllUserTokens(user.id!!)

        logger.info("Password reset for user: ${user.email}")

        return MessageResponse("Password has been reset successfully")
    }

    fun toUserResponse(user: User): UserResponse {
        return UserResponse(
            id = user.id!!,
            email = user.email,
            displayName = user.displayName,
            avatarUrl = user.avatarUrl,
            emailVerified = user.emailVerified,
            linkedProviders = user.oauthAccounts.map { it.provider },
            createdAt = user.createdAt
        )
    }
}

package com.golinks.golinks.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Email service — placeholder implementation that logs to console.
 * Replace with real SMTP integration in production.
 */
@Service
class EmailService {

    private val logger = LoggerFactory.getLogger(EmailService::class.java)

    fun sendVerificationEmail(email: String, token: String) {
        val verificationUrl = "http://localhost:3000/verify-email?token=$token"
        logger.info("""
            |================================================
            | VERIFICATION EMAIL
            |================================================
            | To: $email
            | Subject: Verify your Golinks account
            | 
            | Click the link below to verify your email:
            | $verificationUrl
            |================================================
        """.trimMargin())
    }

    fun sendPasswordResetEmail(email: String, token: String) {
        val resetUrl = "http://localhost:3000/reset-password?token=$token"
        logger.info("""
            |================================================
            | PASSWORD RESET EMAIL
            |================================================
            | To: $email
            | Subject: Reset your Golinks password
            | 
            | Click the link below to reset your password:
            | $resetUrl
            |================================================
        """.trimMargin())
    }

    fun sendSecurityAlertEmail(email: String, message: String) {
        logger.info("""
            |================================================
            | SECURITY ALERT EMAIL
            |================================================
            | To: $email
            | Subject: Security alert for your Golinks account
            | 
            | $message
            |================================================
        """.trimMargin())
    }
}

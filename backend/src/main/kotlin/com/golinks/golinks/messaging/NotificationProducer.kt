package com.golinks.golinks.messaging

import com.golinks.golinks.config.RabbitConfig
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Component
import java.util.UUID

@Component
class NotificationProducer(
    private val rabbitTemplate: RabbitTemplate
) {

    private val logger = LoggerFactory.getLogger(NotificationProducer::class.java)

    fun sendUserRegisteredEvent(userId: UUID, email: String, verificationToken: String) {
        val event = UserRegisteredEvent(userId, email, verificationToken)
        try {
            rabbitTemplate.convertAndSend(RabbitConfig.USER_REGISTERED_QUEUE, event)
            logger.info("Published UserRegisteredEvent for user: $email")
        } catch (ex: Exception) {
            // If RabbitMQ is down, log and continue (non-critical path)
            logger.warn("Failed to publish UserRegisteredEvent: ${ex.message}. Processing inline.")
            // Fallback: log the verification URL directly
            logger.info("Verification token for $email: $verificationToken")
        }
    }

    fun sendPasswordResetEvent(userId: UUID, email: String, resetToken: String) {
        val event = PasswordResetEvent(userId, email, resetToken)
        try {
            rabbitTemplate.convertAndSend(RabbitConfig.PASSWORD_RESET_QUEUE, event)
            logger.info("Published PasswordResetEvent for user: $email")
        } catch (ex: Exception) {
            logger.warn("Failed to publish PasswordResetEvent: ${ex.message}. Processing inline.")
            logger.info("Password reset token for $email: $resetToken")
        }
    }
}

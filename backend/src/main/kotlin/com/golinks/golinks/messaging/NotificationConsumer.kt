package com.golinks.golinks.messaging

import com.golinks.golinks.config.RabbitConfig
import com.golinks.golinks.service.EmailService
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component

@Component
class NotificationConsumer(
    private val emailService: EmailService
) {

    private val logger = LoggerFactory.getLogger(NotificationConsumer::class.java)

    @RabbitListener(queues = [RabbitConfig.USER_REGISTERED_QUEUE])
    fun handleUserRegistered(event: UserRegisteredEvent) {
        logger.info("Received UserRegisteredEvent for user: ${event.email}")
        emailService.sendVerificationEmail(event.email, event.verificationToken)
    }

    @RabbitListener(queues = [RabbitConfig.PASSWORD_RESET_QUEUE])
    fun handlePasswordReset(event: PasswordResetEvent) {
        logger.info("Received PasswordResetEvent for user: ${event.email}")
        emailService.sendPasswordResetEmail(event.email, event.resetToken)
    }
}

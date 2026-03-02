package com.golinks.golinks.config

import org.springframework.amqp.core.Queue
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter
import org.springframework.amqp.support.converter.MessageConverter
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class RabbitConfig {

    companion object {
        const val USER_REGISTERED_QUEUE = "user.registered"
        const val PASSWORD_RESET_QUEUE = "password.reset"
        const val LINK_AUDIT_QUEUE = "link.audit"
        const val LINK_CLICK_QUEUE = "link.click"
        const val BULK_IMPORT_QUEUE = "link.bulk-import"
    }

    @Bean
    fun userRegisteredQueue(): Queue = Queue(USER_REGISTERED_QUEUE, true)

    @Bean
    fun passwordResetQueue(): Queue = Queue(PASSWORD_RESET_QUEUE, true)

    @Bean
    fun linkAuditQueue(): Queue = Queue(LINK_AUDIT_QUEUE, true)

    @Bean
    fun linkClickQueue(): Queue = Queue(LINK_CLICK_QUEUE, true)

    @Bean
    fun bulkImportQueue(): Queue = Queue(BULK_IMPORT_QUEUE, true)

    @Bean
    fun jsonMessageConverter(): MessageConverter = Jackson2JsonMessageConverter()
}

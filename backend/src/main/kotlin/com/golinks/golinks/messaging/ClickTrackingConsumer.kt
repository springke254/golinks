package com.golinks.golinks.messaging

import com.golinks.golinks.config.RabbitConfig
import com.golinks.golinks.service.ClickIngestionService
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class ClickTrackingConsumer(
    private val clickIngestionService: ClickIngestionService
) {

    private val logger = LoggerFactory.getLogger(ClickTrackingConsumer::class.java)

    @RabbitListener(queues = [RabbitConfig.LINK_CLICK_QUEUE])
    @Transactional
    fun handleClickEvent(event: ClickEvent) {
        clickIngestionService.ingest(event)
        logger.debug(
            "Async click ingested for slug={} ip={} ua={} ref={} ts={}",
            event.slug,
            event.ip ?: "unknown",
            event.userAgent?.take(50) ?: "unknown",
            event.referrer ?: "direct",
            event.timestamp
        )
    }
}

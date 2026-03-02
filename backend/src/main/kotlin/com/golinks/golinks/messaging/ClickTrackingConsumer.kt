package com.golinks.golinks.messaging

import com.golinks.golinks.config.RabbitConfig
import com.golinks.golinks.entity.ClickEventEntity
import com.golinks.golinks.repository.ClickEventRepository
import com.golinks.golinks.repository.ShortUrlRepository
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
class ClickTrackingConsumer(
    private val shortUrlRepository: ShortUrlRepository,
    private val clickEventRepository: ClickEventRepository
) {

    private val logger = LoggerFactory.getLogger(ClickTrackingConsumer::class.java)

    @RabbitListener(queues = [RabbitConfig.LINK_CLICK_QUEUE])
    @Transactional
    fun handleClickEvent(event: ClickEvent) {
        try {
            // Increment the aggregate click counter on the short_urls row
            shortUrlRepository.incrementClickCount(event.slug)

            // Persist a detailed click event for analytics
            val shortUrl = shortUrlRepository.findBySlugAndDeletedFalse(event.slug)
            val clickEvent = ClickEventEntity(
                shortUrlId = shortUrl?.id,
                slug = event.slug,
                ip = event.ip,
                userAgent = event.userAgent,
                referrer = event.referrer,
                createdAt = event.timestamp ?: java.time.Instant.now()
            )
            clickEventRepository.save(clickEvent)

            logger.debug(
                "Click recorded for slug={} ip={} ua={} ref={} ts={}",
                event.slug,
                event.ip ?: "unknown",
                event.userAgent?.take(50) ?: "unknown",
                event.referrer ?: "direct",
                event.timestamp
            )
        } catch (ex: Exception) {
            logger.error("Failed to process click for slug=${event.slug}: ${ex.message}")
        }
    }
}

package com.golinks.golinks.service

import com.golinks.golinks.entity.ClickEventEntity
import com.golinks.golinks.messaging.ClickEvent
import com.golinks.golinks.repository.ClickEventRepository
import com.golinks.golinks.repository.ShortUrlRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ClickIngestionService(
    private val shortUrlRepository: ShortUrlRepository,
    private val clickEventRepository: ClickEventRepository,
    private val clickMetadataService: ClickMetadataService
) {

    private val logger = LoggerFactory.getLogger(ClickIngestionService::class.java)

    @Transactional
    fun ingest(event: ClickEvent) {
        val shortUrl = shortUrlRepository.findBySlugAndDeletedFalse(event.slug)
        if (shortUrl == null) {
            logger.warn("Skipping click ingestion for unknown slug={}", event.slug)
            return
        }

        shortUrlRepository.incrementClickCount(event.slug)

        val metadata = clickMetadataService.enrich(event.ip, event.userAgent, event.acceptLanguage)
        val clickEvent = ClickEventEntity(
            shortUrlId = shortUrl.id,
            ownerUserId = shortUrl.user.id,
            slug = event.slug,
            ip = event.ip?.take(45),
            userAgent = event.userAgent,
            referrer = event.referrer,
            visitorId = metadata.visitorId,
            osName = metadata.osName,
            browserName = metadata.browserName,
            deviceType = metadata.deviceType,
            country = metadata.country,
            region = metadata.region,
            city = metadata.city,
            createdAt = event.timestamp ?: java.time.Instant.now()
        )

        clickEventRepository.save(clickEvent)
    }
}

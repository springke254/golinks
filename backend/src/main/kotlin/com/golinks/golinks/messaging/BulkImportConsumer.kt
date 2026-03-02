package com.golinks.golinks.messaging

import com.golinks.golinks.config.RabbitConfig
import com.golinks.golinks.service.BulkOperationService
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.annotation.RabbitListener
import org.springframework.stereotype.Component

@Component
class BulkImportConsumer(
    private val bulkOperationService: BulkOperationService
) {

    private val logger = LoggerFactory.getLogger(BulkImportConsumer::class.java)

    @RabbitListener(queues = [RabbitConfig.BULK_IMPORT_QUEUE])
    fun handleBulkImport(event: BulkImportEvent) {
        logger.info("Received bulk import event: operationId=${event.operationId}")
        try {
            bulkOperationService.processBulkImport(event.operationId, event.userId, event.csvContent)
        } catch (ex: Exception) {
            logger.error("Failed to process bulk import operationId=${event.operationId}: ${ex.message}", ex)
        }
    }
}

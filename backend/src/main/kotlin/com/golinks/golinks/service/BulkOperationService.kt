package com.golinks.golinks.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.golinks.golinks.config.RabbitConfig
import com.golinks.golinks.dto.BulkImportOperationResponse
import com.golinks.golinks.dto.BulkRowResult
import com.golinks.golinks.dto.CreateLinkRequest
import com.golinks.golinks.entity.BulkOperation
import com.golinks.golinks.entity.BulkOperationStatus
import com.golinks.golinks.exception.BulkOperationNotFoundException
import com.golinks.golinks.exception.UserNotFoundException
import com.golinks.golinks.messaging.BulkImportEvent
import com.golinks.golinks.repository.BulkOperationRepository
import com.golinks.golinks.repository.UserRepository
import org.apache.commons.csv.CSVFormat
import org.apache.commons.csv.CSVParser
import org.slf4j.LoggerFactory
import org.springframework.amqp.rabbit.core.RabbitTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import java.io.InputStreamReader
import java.util.UUID

@Service
class BulkOperationService(
    private val bulkOperationRepository: BulkOperationRepository,
    private val userRepository: UserRepository,
    private val linkService: LinkService,
    private val rabbitTemplate: RabbitTemplate,
    private val objectMapper: ObjectMapper
) {

    private val logger = LoggerFactory.getLogger(BulkOperationService::class.java)

    @Transactional
    fun startBulkImport(userId: UUID, file: MultipartFile): BulkImportOperationResponse {
        val user = userRepository.findById(userId)
            .orElseThrow { UserNotFoundException() }

        // Count rows in CSV
        val reader = InputStreamReader(file.inputStream)
        val parser = CSVParser(reader, CSVFormat.DEFAULT.builder()
            .setHeader()
            .setSkipHeaderRecord(true)
            .setIgnoreHeaderCase(true)
            .setTrim(true)
            .build())
        val rows = parser.records.size
        parser.close()

        val operation = BulkOperation(
            user = user,
            status = BulkOperationStatus.PENDING,
            totalRows = rows,
            fileName = file.originalFilename
        )
        val saved = bulkOperationRepository.save(operation)

        // Publish event to RabbitMQ for async processing
        try {
            rabbitTemplate.convertAndSend(
                RabbitConfig.BULK_IMPORT_QUEUE,
                BulkImportEvent(operationId = saved.id!!, userId = userId, csvContent = String(file.bytes))
            )
            logger.info("Published bulk import event: operationId=${saved.id}, rows=$rows")
        } catch (ex: Exception) {
            logger.warn("Failed to publish bulk import event, processing inline: ${ex.message}")
            // Process inline as fallback
            processBulkImport(saved.id!!, userId, String(file.bytes))
        }

        return toOperationResponse(saved)
    }

    @Transactional
    fun processBulkImport(operationId: UUID, userId: UUID, csvContent: String) {
        val operation = bulkOperationRepository.findById(operationId).orElse(null) ?: return

        operation.status = BulkOperationStatus.PROCESSING
        bulkOperationRepository.save(operation)

        val results = mutableListOf<BulkRowResult>()
        var successCount = 0
        var errorCount = 0

        try {
            val parser = CSVParser.parse(csvContent, CSVFormat.DEFAULT.builder()
                .setHeader()
                .setSkipHeaderRecord(true)
                .setIgnoreHeaderCase(true)
                .setTrim(true)
                .build())

            for ((index, record) in parser.withIndex()) {
                val rowNum = index + 1
                try {
                    val destinationUrl = record.get("url")
                        ?: record.get("destination_url")
                        ?: record.get("destinationUrl")
                        ?: record.get("destination")

                    if (destinationUrl.isNullOrBlank()) {
                        results.add(BulkRowResult(row = rowNum, success = false, slug = null, error = "Missing URL"))
                        errorCount++
                        continue
                    }

                    val slug = try { record.get("slug") } catch (_: Exception) { null }
                    val title = try { record.get("title") } catch (_: Exception) { null }
                    val tags = try { record.get("tags")?.split(",")?.map { it.trim() }?.filter { it.isNotBlank() } } catch (_: Exception) { null }

                    val request = CreateLinkRequest(
                        destinationUrl = destinationUrl,
                        slug = slug?.takeIf { it.isNotBlank() },
                        title = title?.takeIf { it.isNotBlank() },
                        tags = tags
                    )

                    val response = linkService.createLink(userId, request)
                    results.add(BulkRowResult(row = rowNum, success = true, slug = response.slug, error = null))
                    successCount++
                } catch (ex: Exception) {
                    results.add(BulkRowResult(row = rowNum, success = false, slug = null, error = ex.message ?: "Unknown error"))
                    errorCount++
                }

                // Update progress
                operation.processedRows = rowNum
                operation.successCount = successCount
                operation.errorCount = errorCount
                bulkOperationRepository.save(operation)
            }

            parser.close()
        } catch (ex: Exception) {
            logger.error("Bulk import failed for operationId=$operationId: ${ex.message}", ex)
            operation.status = BulkOperationStatus.FAILED
            bulkOperationRepository.save(operation)
            return
        }

        operation.status = BulkOperationStatus.COMPLETED
        operation.results = objectMapper.writeValueAsString(results)
        operation.successCount = successCount
        operation.errorCount = errorCount
        bulkOperationRepository.save(operation)

        logger.info("Bulk import completed: operationId=$operationId, success=$successCount, errors=$errorCount")
    }

    @Transactional(readOnly = true)
    fun getOperationStatus(userId: UUID, operationId: UUID): BulkImportOperationResponse {
        val operation = bulkOperationRepository.findByIdAndUserId(operationId, userId)
            ?: throw BulkOperationNotFoundException()
        return toOperationResponse(operation)
    }

    private fun toOperationResponse(operation: BulkOperation): BulkImportOperationResponse {
        val results = operation.results?.let {
            try {
                objectMapper.readValue(
                    it,
                    objectMapper.typeFactory.constructCollectionType(List::class.java, BulkRowResult::class.java)
                )
            } catch (_: Exception) { null }
        }

        return BulkImportOperationResponse(
            id = operation.id!!,
            status = operation.status.name,
            totalRows = operation.totalRows,
            processedRows = operation.processedRows,
            successCount = operation.successCount,
            errorCount = operation.errorCount,
            results = results
        )
    }
}

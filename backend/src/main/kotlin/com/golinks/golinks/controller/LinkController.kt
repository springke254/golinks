package com.golinks.golinks.controller

import com.golinks.golinks.dto.*
import com.golinks.golinks.service.BulkOperationService
import com.golinks.golinks.service.LinkService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.*

@RestController
@RequestMapping("/api/v1/links")
class LinkController(
    private val linkService: LinkService,
    private val bulkOperationService: BulkOperationService
) {

    @PostMapping
    fun createLink(@Valid @RequestBody request: CreateLinkRequest): ResponseEntity<LinkResponse> {
        val userId = getCurrentUserId()
        val response = linkService.createLink(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping
    fun getLinks(
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) cursor: String?,
        @RequestParam(defaultValue = "20") limit: Int
    ): ResponseEntity<PaginatedLinksResponse> {
        val userId = getCurrentUserId()
        val response = linkService.getLinks(userId, search, cursor, limit)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/{id}")
    fun getLinkById(@PathVariable id: UUID): ResponseEntity<LinkResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(linkService.getLinkById(userId, id))
    }

    @PutMapping("/{id}")
    fun updateLink(
        @PathVariable id: UUID,
        @Valid @RequestBody request: UpdateLinkRequest
    ): ResponseEntity<LinkResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(linkService.updateLink(userId, id, request))
    }

    @DeleteMapping("/{id}")
    fun deleteLink(@PathVariable id: UUID): ResponseEntity<MessageResponse> {
        val userId = getCurrentUserId()
        linkService.softDeleteLink(userId, id)
        return ResponseEntity.ok(MessageResponse("Link deleted successfully"))
    }

    @PostMapping("/bulk-delete")
    fun bulkDelete(@Valid @RequestBody request: BulkDeleteRequest): ResponseEntity<BulkOperationResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(linkService.bulkSoftDelete(userId, request.ids))
    }

    @GetMapping("/stats")
    fun getStats(): ResponseEntity<LinkStatsResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(linkService.getStats(userId))
    }

    @GetMapping("/check-slug/{slug}")
    fun checkSlug(@PathVariable slug: String): ResponseEntity<SlugCheckResponse> {
        return ResponseEntity.ok(linkService.checkSlugAvailability(slug))
    }

    @GetMapping("/tags")
    fun getUserTags(): ResponseEntity<List<TagResponse>> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(linkService.getUserTags(userId))
    }

    @PostMapping("/bulk-import", consumes = [MediaType.MULTIPART_FORM_DATA_VALUE])
    fun bulkImport(@RequestParam("file") file: MultipartFile): ResponseEntity<BulkImportOperationResponse> {
        val userId = getCurrentUserId()
        val response = bulkOperationService.startBulkImport(userId, file)
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response)
    }

    @GetMapping("/bulk-operations/{operationId}")
    fun getBulkOperationStatus(@PathVariable operationId: UUID): ResponseEntity<BulkImportOperationResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(bulkOperationService.getOperationStatus(userId, operationId))
    }

    private fun getCurrentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
        val username = (authentication?.principal as? org.springframework.security.core.userdetails.UserDetails)?.username
            ?: throw com.golinks.golinks.exception.InvalidCredentialsException("Authentication required")
        return try {
            UUID.fromString(username)
        } catch (ex: IllegalArgumentException) {
            throw com.golinks.golinks.exception.InvalidCredentialsException("Invalid authentication token")
        }
    }
}

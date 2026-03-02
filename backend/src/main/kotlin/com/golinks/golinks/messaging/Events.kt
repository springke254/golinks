package com.golinks.golinks.messaging

import java.io.Serializable
import java.time.Instant
import java.util.UUID

data class UserRegisteredEvent(
    val userId: UUID,
    val email: String,
    val verificationToken: String
) : Serializable

data class PasswordResetEvent(
    val userId: UUID,
    val email: String,
    val resetToken: String
) : Serializable

data class LinkAuditEvent(
    val userId: UUID,
    val shortUrlId: UUID?,
    val action: String,
    val details: String? = null
) : Serializable

data class ClickEvent(
    val slug: String,
    val timestamp: Instant? = null,
    val ip: String? = null,
    val userAgent: String? = null,
    val referrer: String? = null
) : Serializable

data class BulkImportEvent(
    val operationId: UUID,
    val userId: UUID,
    val csvContent: String
) : Serializable

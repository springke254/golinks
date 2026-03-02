package com.golinks.golinks.entity

import jakarta.persistence.*
import java.time.Instant
import java.util.UUID

enum class BulkOperationStatus {
    PENDING, PROCESSING, COMPLETED, FAILED
}

@Entity
@Table(name = "bulk_operations")
class BulkOperation(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    val user: User,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: BulkOperationStatus = BulkOperationStatus.PENDING,

    @Column(name = "total_rows", nullable = false)
    var totalRows: Int = 0,

    @Column(name = "processed_rows", nullable = false)
    var processedRows: Int = 0,

    @Column(name = "success_count", nullable = false)
    var successCount: Int = 0,

    @Column(name = "error_count", nullable = false)
    var errorCount: Int = 0,

    @Column(columnDefinition = "jsonb")
    var results: String? = null,

    @Column(name = "file_name", length = 255)
    var fileName: String? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: Instant = Instant.now()
) {
    @PreUpdate
    fun onUpdate() {
        updatedAt = Instant.now()
    }
}

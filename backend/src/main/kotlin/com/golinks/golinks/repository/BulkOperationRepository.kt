package com.golinks.golinks.repository

import com.golinks.golinks.entity.BulkOperation
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface BulkOperationRepository : JpaRepository<BulkOperation, UUID> {

    fun findByIdAndUserId(id: UUID, userId: UUID): BulkOperation?
}

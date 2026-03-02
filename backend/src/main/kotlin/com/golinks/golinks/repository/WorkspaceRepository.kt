package com.golinks.golinks.repository

import com.golinks.golinks.entity.Workspace
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface WorkspaceRepository : JpaRepository<Workspace, UUID> {
    fun findBySlug(slug: String): Workspace?
    fun existsBySlug(slug: String): Boolean
}

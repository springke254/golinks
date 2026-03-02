package com.golinks.golinks.repository

import com.golinks.golinks.entity.Tag
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.UUID

@Repository
interface TagRepository : JpaRepository<Tag, UUID> {

    fun findByNameAndUserId(name: String, userId: UUID): Tag?

    fun findAllByUserId(userId: UUID): List<Tag>

    fun findByNameInAndUserId(names: Collection<String>, userId: UUID): List<Tag>
}

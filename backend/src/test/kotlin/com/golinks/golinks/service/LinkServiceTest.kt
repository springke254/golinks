package com.golinks.golinks.service

import com.golinks.golinks.dto.CreateLinkRequest
import com.golinks.golinks.dto.UpdateLinkRequest
import com.golinks.golinks.entity.User
import com.golinks.golinks.exception.DuplicateSlugException
import com.golinks.golinks.exception.LinkNotFoundException
import com.golinks.golinks.messaging.NotificationProducer
import com.golinks.golinks.repository.ShortUrlRepository
import com.golinks.golinks.repository.TagRepository
import com.golinks.golinks.repository.UserRepository
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.test.context.ActiveProfiles
import java.util.*

@SpringBootTest
@ActiveProfiles("test")
class LinkServiceTest {

    @Autowired
    private lateinit var linkService: LinkService

    @Autowired
    private lateinit var shortUrlRepository: ShortUrlRepository

    @Autowired
    private lateinit var tagRepository: TagRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @MockBean
    private lateinit var notificationProducer: NotificationProducer

    @MockBean
    private lateinit var redisTemplate: StringRedisTemplate

    private lateinit var testUser: User

    @BeforeEach
    fun setUp() {
        shortUrlRepository.deleteAll()
        tagRepository.deleteAll()
        userRepository.deleteAll()

        testUser = userRepository.save(
            User(
                email = "linktest@example.com",
                passwordHash = "\$2a\$10\$dummyhashfortest",
                displayName = "Link Test User",
                emailVerified = true
            )
        )
    }

    @Test
    fun `createLink should create link with auto-generated slug`() {
        val request = CreateLinkRequest(
            destinationUrl = "https://example.com/test-page",
            title = "Test Link"
        )

        val result = linkService.createLink(testUser.id!!, request)

        assertNotNull(result.id)
        assertNotNull(result.slug)
        assertTrue(result.slug.length >= 3)
        assertEquals("https://example.com/test-page", result.destinationUrl)
        assertEquals("Test Link", result.title)
        assertTrue(result.isActive)
        assertEquals(0, result.clicksCount)
    }

    @Test
    fun `createLink should create link with custom slug`() {
        val request = CreateLinkRequest(
            destinationUrl = "https://example.com",
            slug = "custom-slug",
            title = "Custom Slug Link"
        )

        val result = linkService.createLink(testUser.id!!, request)

        assertEquals("custom-slug", result.slug)
        assertEquals("https://example.com", result.destinationUrl)
    }

    @Test
    fun `createLink should throw on duplicate slug`() {
        val request = CreateLinkRequest(
            destinationUrl = "https://example.com",
            slug = "duplicate-test"
        )
        linkService.createLink(testUser.id!!, request)

        assertThrows<DuplicateSlugException> {
            linkService.createLink(testUser.id!!, request)
        }
    }

    @Test
    fun `createLink should prepend https if missing`() {
        val request = CreateLinkRequest(
            destinationUrl = "example.com/page"
        )

        val result = linkService.createLink(testUser.id!!, request)

        assertEquals("https://example.com/page", result.destinationUrl)
    }

    @Test
    fun `createLink should create link with tags`() {
        val request = CreateLinkRequest(
            destinationUrl = "https://example.com",
            tags = listOf("docs", "engineering")
        )

        val result = linkService.createLink(testUser.id!!, request)

        assertEquals(2, result.tags.size)
        assertTrue(result.tags.any { it.name == "docs" })
        assertTrue(result.tags.any { it.name == "engineering" })
    }

    @Test
    fun `createLink should create link with password protection`() {
        val request = CreateLinkRequest(
            destinationUrl = "https://secret.example.com",
            password = "secure123"
        )

        val result = linkService.createLink(testUser.id!!, request)

        assertTrue(result.isPasswordProtected)
    }

    @Test
    fun `createLink should create link with protection fields`() {
        val request = CreateLinkRequest(
            destinationUrl = "https://example.com",
            isPrivate = true,
            isOneTime = true,
            maxClicks = 10
        )

        val result = linkService.createLink(testUser.id!!, request)

        assertTrue(result.isPrivate)
        assertTrue(result.isOneTime)
        assertEquals(10, result.maxClicks)
    }

    @Test
    fun `getLinks should return paginated links`() {
        // Create some links
        repeat(5) { i ->
            linkService.createLink(
                testUser.id!!,
                CreateLinkRequest(destinationUrl = "https://example.com/$i")
            )
        }

        val result = linkService.getLinks(testUser.id!!, null, null, 0, 3)

        assertEquals(3, result.items.size)
        assertNotNull(result.nextCursor)
    }

    @Test
    fun `getLinks should filter by search`() {
        linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(destinationUrl = "https://google.com", slug = "google-search")
        )
        linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(destinationUrl = "https://github.com", slug = "github-repo")
        )

        val result = linkService.getLinks(testUser.id!!, "google", null, 0, 20)

        assertEquals(1, result.items.size)
        assertEquals("google-search", result.items[0].slug)
    }

    @Test
    fun `updateLink should update destination url`() {
        val created = linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(destinationUrl = "https://old.example.com", slug = "update-test")
        )

        val result = linkService.updateLink(
            testUser.id!!,
            created.id,
            UpdateLinkRequest(destinationUrl = "https://new.example.com")
        )

        assertEquals("https://new.example.com", result.destinationUrl)
    }

    @Test
    fun `softDeleteLink should mark link as deleted`() {
        val created = linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(destinationUrl = "https://delete-me.com", slug = "delete-test")
        )

        linkService.softDeleteLink(testUser.id!!, created.id)

        assertThrows<LinkNotFoundException> {
            linkService.getLinkById(testUser.id!!, created.id)
        }
    }

    @Test
    fun `checkSlugAvailability should return true for available slug`() {
        val result = linkService.checkSlugAvailability("available-slug")

        assertTrue(result.available)
    }

    @Test
    fun `checkSlugAvailability should return false and suggestions for taken slug`() {
        linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(destinationUrl = "https://example.com", slug = "taken-slug")
        )

        val result = linkService.checkSlugAvailability("taken-slug")

        assertFalse(result.available)
        assertTrue(result.suggestions.isNotEmpty())
    }

    @Test
    fun `getUserTags should return user tags`() {
        linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(
                destinationUrl = "https://example.com",
                tags = listOf("frontend", "backend")
            )
        )

        val tags = linkService.getUserTags(testUser.id!!)

        assertEquals(2, tags.size)
    }

    @Test
    fun `getStats should return correct statistics`() {
        repeat(3) { i ->
            linkService.createLink(
                testUser.id!!,
                CreateLinkRequest(destinationUrl = "https://example.com/$i")
            )
        }

        val stats = linkService.getStats(testUser.id!!)

        assertEquals(3, stats.totalLinks)
        assertEquals(3, stats.activeLinks)
        assertEquals(0, stats.totalClicks)
    }

    @Test
    fun `updateLink should add and remove tags`() {
        val created = linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(
                destinationUrl = "https://example.com",
                tags = listOf("old-tag")
            )
        )

        val updated = linkService.updateLink(
            testUser.id!!,
            created.id,
            UpdateLinkRequest(tags = listOf("new-tag-1", "new-tag-2"))
        )

        assertEquals(2, updated.tags.size)
        assertTrue(updated.tags.any { it.name == "new-tag-1" })
        assertTrue(updated.tags.any { it.name == "new-tag-2" })
        assertFalse(updated.tags.any { it.name == "old-tag" })
    }

    @Test
    fun `bulkSoftDelete should delete multiple links`() {
        val ids = (1..3).map { i ->
            linkService.createLink(
                testUser.id!!,
                CreateLinkRequest(destinationUrl = "https://bulk-$i.com")
            ).id
        }

        val result = linkService.bulkSoftDelete(testUser.id!!, ids)

        assertEquals(3, result.successCount)
    }
}

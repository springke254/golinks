package com.golinks.golinks.controller

import com.golinks.golinks.dto.CreateLinkRequest
import com.golinks.golinks.entity.User
import com.golinks.golinks.messaging.NotificationProducer
import com.golinks.golinks.repository.ShortUrlRepository
import com.golinks.golinks.repository.TagRepository
import com.golinks.golinks.repository.UserRepository
import com.golinks.golinks.service.LinkService
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RedirectControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

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
                email = "redirect-test@example.com",
                passwordHash = "\$2a\$10\$dummyhashfortest",
                displayName = "Redirect Test User",
                emailVerified = true
            )
        )
    }

    @Test
    fun `GET go_slug should redirect to destination`() {
        val link = linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(
                destinationUrl = "https://example.com/destination",
                slug = "redirect-test"
            )
        )

        mockMvc.perform(get("/go/redirect-test"))
            .andExpect(status().isFound)
            .andExpect(header().string("Location", "https://example.com/destination"))
    }

    @Test
    fun `GET go_slug should return 404 for non-existent slug`() {
        mockMvc.perform(get("/go/non-existent-slug"))
            .andExpect(status().isNotFound)
    }

    @Test
    fun `GET go_slug should return password challenge page for protected link`() {
        linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(
                destinationUrl = "https://secret.example.com",
                slug = "protected-link",
                password = "test-password"
            )
        )

        mockMvc.perform(get("/go/protected-link"))
            .andExpect(status().isOk)
            .andExpect(content().contentTypeCompatibleWith("text/html"))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("Password Required")))
    }

    @Test
    fun `GET go_slug should redirect one-time link and consume it`() {
        linkService.createLink(
            testUser.id!!,
            CreateLinkRequest(
                destinationUrl = "https://onetime.example.com",
                slug = "one-time-link",
                isOneTime = true
            )
        )

        // First access should redirect
        mockMvc.perform(get("/go/one-time-link"))
            .andExpect(status().isFound)
            .andExpect(header().string("Location", "https://onetime.example.com"))

        // Second access should return 410 or 404
        mockMvc.perform(get("/go/one-time-link"))
            .andExpect(status().isGone)
    }
}

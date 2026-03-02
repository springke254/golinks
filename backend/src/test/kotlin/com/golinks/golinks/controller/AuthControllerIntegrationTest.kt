package com.golinks.golinks.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.golinks.golinks.dto.LoginRequest
import com.golinks.golinks.dto.SignupRequest
import com.golinks.golinks.messaging.NotificationProducer
import com.golinks.golinks.repository.EmailVerificationTokenRepository
import com.golinks.golinks.repository.PasswordResetTokenRepository
import com.golinks.golinks.repository.RefreshTokenRepository
import com.golinks.golinks.repository.UserRepository
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var refreshTokenRepository: RefreshTokenRepository

    @Autowired
    private lateinit var emailVerificationTokenRepository: EmailVerificationTokenRepository

    @Autowired
    private lateinit var passwordResetTokenRepository: PasswordResetTokenRepository

    @MockBean
    private lateinit var notificationProducer: NotificationProducer

    @BeforeEach
    fun setUp() {
        emailVerificationTokenRepository.deleteAll()
        passwordResetTokenRepository.deleteAll()
        refreshTokenRepository.deleteAll()
        userRepository.deleteAll()
    }

    @Test
    fun `POST signup should return 201 and user response`() {
        val request = SignupRequest(
            email = "test@example.com",
            password = "Password123!",
            displayName = "Test User"
        )

        mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.email").value("test@example.com"))
            .andExpect(jsonPath("$.displayName").value("Test User"))
            .andExpect(jsonPath("$.emailVerified").value(false))
    }

    @Test
    fun `POST signup with duplicate email should return 409`() {
        val request = SignupRequest(
            email = "test@example.com",
            password = "Password123!",
            displayName = "Test User"
        )

        // First signup
        mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        ).andExpect(status().isCreated)

        // Duplicate signup
        mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        ).andExpect(status().isConflict)
    }

    @Test
    fun `POST signup with invalid email should return 400`() {
        val request = mapOf(
            "email" to "not-an-email",
            "password" to "Password123!",
            "displayName" to "Test User"
        )

        mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `POST login should return 200 and token response with refresh cookie`() {
        // Sign up first
        val signupRequest = SignupRequest(
            email = "test@example.com",
            password = "Password123!",
            displayName = "Test User"
        )
        mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest))
        ).andExpect(status().isCreated)

        // Login
        val loginRequest = LoginRequest(
            email = "test@example.com",
            password = "Password123!"
        )
        mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").isNotEmpty)
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(header().exists("Set-Cookie"))
    }

    @Test
    fun `POST login with wrong password should return 401`() {
        // Sign up first
        val signupRequest = SignupRequest(
            email = "test@example.com",
            password = "Password123!",
            displayName = "Test User"
        )
        mockMvc.perform(
            post("/api/v1/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(signupRequest))
        ).andExpect(status().isCreated)

        // Login with wrong password
        val loginRequest = LoginRequest(
            email = "test@example.com",
            password = "WrongPassword!"
        )
        mockMvc.perform(
            post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest))
        ).andExpect(status().isUnauthorized)
    }

    @Test
    fun `POST refresh without cookie should return 401`() {
        mockMvc.perform(
            post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
        ).andExpect(status().isUnauthorized)
    }

    @Test
    fun `GET verify-email with invalid token should return 401`() {
        mockMvc.perform(
            get("/api/v1/auth/verify-email")
                .param("token", "invalid-token")
        ).andExpect(status().isUnauthorized)
    }

    @Test
    fun `GET users me without auth should return 401 or 403`() {
        mockMvc.perform(
            get("/api/v1/users/me")
        ).andExpect(status().isForbidden)
    }
}

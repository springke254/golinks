package com.golinks.golinks.service

import com.golinks.golinks.config.JwtConfig
import com.golinks.golinks.security.JwtTokenProvider
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.util.UUID

@SpringBootTest
@ActiveProfiles("test")
class TokenServiceTest {

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var tokenService: TokenService

    @Autowired
    private lateinit var jwtConfig: JwtConfig

    @Test
    fun `JWT access token should be generated and validated`() {
        val userId = UUID.randomUUID()
        val email = "test@example.com"

        val token = jwtTokenProvider.generateAccessToken(userId, email)

        assertNotNull(token)
        assertTrue(jwtTokenProvider.validateToken(token))
        assertEquals(userId, jwtTokenProvider.getUserIdFromToken(token))
        assertEquals(email, jwtTokenProvider.getEmailFromToken(token))
    }

    @Test
    fun `invalid JWT should fail validation`() {
        assertFalse(jwtTokenProvider.validateToken("invalid.jwt.token"))
    }

    @Test
    fun `token hash should be consistent for same input`() {
        val rawToken = "test-token-123"
        val hash1 = tokenService.hashToken(rawToken)
        val hash2 = tokenService.hashToken(rawToken)

        assertEquals(hash1, hash2)
    }

    @Test
    fun `different tokens should produce different hashes`() {
        val hash1 = tokenService.hashToken("token-1")
        val hash2 = tokenService.hashToken("token-2")

        assertNotEquals(hash1, hash2)
    }
}

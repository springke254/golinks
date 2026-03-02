package com.golinks.golinks.controller

import com.golinks.golinks.dto.*
import com.golinks.golinks.service.AuthService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseCookie
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService
) {

    companion object {
        private const val REFRESH_TOKEN_COOKIE = "refresh_token"
        private const val REFRESH_TOKEN_MAX_AGE = 7L * 24 * 60 * 60 // 7 days in seconds
        private const val LEGACY_REFRESH_TOKEN_PATH = "/api/v1/auth"
    }

    @PostMapping("/signup")
    fun signup(@Valid @RequestBody request: SignupRequest): ResponseEntity<UserResponse> {
        val userResponse = authService.register(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(userResponse)
    }

    @PostMapping("/login")
    fun login(
        @Valid @RequestBody request: LoginRequest,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse
    ): ResponseEntity<TokenResponse> {
        val userAgent = httpRequest.getHeader("User-Agent")
        val ipAddress = getClientIp(httpRequest)

        val (tokenResponse, refreshToken) = authService.login(request, userAgent, ipAddress)

        // Set refresh token as httpOnly, secure cookie
        val cookie = buildRefreshTokenCookie(refreshToken, REFRESH_TOKEN_MAX_AGE)
        httpResponse.addHeader("Set-Cookie", cookie.toString())
        httpResponse.addHeader("Set-Cookie", buildLegacyRefreshTokenClearCookie().toString())

        return ResponseEntity.ok(tokenResponse)
    }

    @PostMapping("/refresh")
    fun refresh(
        @CookieValue(REFRESH_TOKEN_COOKIE, required = false) refreshToken: String?,
        httpRequest: HttpServletRequest,
        httpResponse: HttpServletResponse
    ): ResponseEntity<TokenResponse> {
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        val userAgent = httpRequest.getHeader("User-Agent")
        val ipAddress = getClientIp(httpRequest)

        val (tokenResponse, newRefreshToken) = authService.refresh(refreshToken, userAgent, ipAddress)

        // Rotate: set new refresh token cookie
        val cookie = buildRefreshTokenCookie(newRefreshToken, REFRESH_TOKEN_MAX_AGE)
        httpResponse.addHeader("Set-Cookie", cookie.toString())
        httpResponse.addHeader("Set-Cookie", buildLegacyRefreshTokenClearCookie().toString())

        return ResponseEntity.ok(tokenResponse)
    }

    @PostMapping("/logout")
    fun logout(
        @CookieValue(REFRESH_TOKEN_COOKIE, required = false) refreshToken: String?,
        httpResponse: HttpServletResponse
    ): ResponseEntity<MessageResponse> {
        authService.logout(refreshToken)

        // Clear the refresh token cookie
        val cookie = buildRefreshTokenCookie("", 0)
        httpResponse.addHeader("Set-Cookie", cookie.toString())
        httpResponse.addHeader("Set-Cookie", buildLegacyRefreshTokenClearCookie().toString())

        return ResponseEntity.ok(MessageResponse("Logged out successfully"))
    }

    @PostMapping("/logout-all")
    fun logoutAll(
        @RequestAttribute("userId") userId: java.util.UUID?,
        httpResponse: HttpServletResponse
    ): ResponseEntity<MessageResponse> {
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build()
        }

        authService.logoutAll(userId)

        // Clear the refresh token cookie
        val cookie = buildRefreshTokenCookie("", 0)
        httpResponse.addHeader("Set-Cookie", cookie.toString())
        httpResponse.addHeader("Set-Cookie", buildLegacyRefreshTokenClearCookie().toString())

        return ResponseEntity.ok(MessageResponse("All sessions revoked"))
    }

    @GetMapping("/verify-email")
    fun verifyEmail(@RequestParam token: String): ResponseEntity<MessageResponse> {
        val response = authService.verifyEmail(token)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/forgot-password")
    fun forgotPassword(@Valid @RequestBody request: ForgotPasswordRequest): ResponseEntity<MessageResponse> {
        val response = authService.forgotPassword(request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/reset-password")
    fun resetPassword(@Valid @RequestBody request: ResetPasswordRequest): ResponseEntity<MessageResponse> {
        val response = authService.resetPassword(request)
        return ResponseEntity.ok(response)
    }

    private fun buildRefreshTokenCookie(value: String, maxAge: Long): ResponseCookie {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, value)
            .httpOnly(true)
            .secure(false) // Set to true in production with HTTPS
            .path("/")
            .maxAge(maxAge)
            .sameSite("Strict")
            .build()
    }

    private fun buildLegacyRefreshTokenClearCookie(): ResponseCookie {
        return ResponseCookie.from(REFRESH_TOKEN_COOKIE, "")
            .httpOnly(true)
            .secure(false)
            .path(LEGACY_REFRESH_TOKEN_PATH)
            .maxAge(0)
            .sameSite("Strict")
            .build()
    }

    private fun getClientIp(request: HttpServletRequest): String {
        val xForwardedFor = request.getHeader("X-Forwarded-For")
        return if (xForwardedFor != null) {
            xForwardedFor.split(",").first().trim()
        } else {
            request.remoteAddr
        }
    }
}

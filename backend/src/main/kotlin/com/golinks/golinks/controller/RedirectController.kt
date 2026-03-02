package com.golinks.golinks.controller

import com.golinks.golinks.dto.PasswordChallengeRequest
import com.golinks.golinks.exception.LinkConsumedException
import com.golinks.golinks.exception.LinkExpiredException
import com.golinks.golinks.exception.LinkNotFoundException
import com.golinks.golinks.security.JwtTokenProvider
import com.golinks.golinks.service.AbuseDetectionService
import com.golinks.golinks.service.RateLimitService
import com.golinks.golinks.service.RedirectService
import com.golinks.golinks.service.TokenService
import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

@RestController
@RequestMapping("/go")
class RedirectController(
    private val redirectService: RedirectService,
    private val jwtTokenProvider: JwtTokenProvider,
    private val tokenService: TokenService,
    private val rateLimitService: RateLimitService,
    private val abuseDetectionService: AbuseDetectionService
) {

    private val logger = LoggerFactory.getLogger(RedirectController::class.java)

    @GetMapping("/{slug}")
    fun redirect(
        @PathVariable slug: String,
        request: HttpServletRequest
    ): ResponseEntity<*> {
        return try {
            // --- Fast path: Redis cache hit for unconstrained links ---
            val cachedMeta = redirectService.getCachedSlugMeta(slug)
            if (cachedMeta != null && !cachedMeta.hasConstraints) {
                redirectService.recordClick(slug, request)
                return fastRedirect(cachedMeta.destinationUrl)
            }

            // --- Slow path: resolve from DB ---
            val shortUrl = redirectService.resolveSlug(slug)

            // One-time link handling (atomic consume)
            if (shortUrl.isOneTime) {
                val destination = redirectService.consumeOneTimeLink(slug)
                redirectService.recordClick(slug, request)
                return fastRedirect(destination)
            }

            // Private link — requires authenticated session
            if (shortUrl.isPrivate) {
                if (!isAuthenticatedRequest(request)) {
                    val queryPart = request.queryString?.takeIf { it.isNotBlank() }?.let { "?$it" } ?: ""
                    val redirectTarget = "/go/$slug$queryPart"
                    val encodedRedirect = URLEncoder.encode(redirectTarget, StandardCharsets.UTF_8)
                    return ResponseEntity.status(HttpStatus.FOUND)
                        .location(URI.create("/login?redirect=$encodedRedirect"))
                        .build<Any>()
                }
            }

            // Password-protected link — serve challenge page
            if (shortUrl.isPasswordProtected) {
                val pwCookie = request.cookies?.find { it.name == "go_pw_$slug" }
                if (pwCookie == null || pwCookie.value != "verified") {
                    return ResponseEntity.ok()
                        .header("Content-Type", "text/html")
                        .body(renderPasswordChallengePage(slug))
                }
            }

            // Cache slug metadata for future fast-path hits
            redirectService.cacheSlugMeta(
                slug = slug,
                destinationUrl = shortUrl.destinationUrl,
                hasConstraints = shortUrl.isPasswordProtected || shortUrl.isPrivate || shortUrl.isOneTime
            )

            // Fire analytics asynchronously
            redirectService.recordClick(slug, request)

            fastRedirect(shortUrl.destinationUrl)

        } catch (ex: LinkNotFoundException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .header("Content-Type", "text/html")
                .body(renderErrorPage("Link Not Found", "The short link you're looking for doesn't exist or has been removed."))
        } catch (ex: LinkExpiredException) {
            ResponseEntity.status(HttpStatus.GONE)
                .header("Content-Type", "text/html")
                .body(renderErrorPage("Link Expired", ex.message ?: "This link has expired."))
        } catch (ex: LinkConsumedException) {
            ResponseEntity.status(HttpStatus.GONE)
                .header("Content-Type", "text/html")
                .body(renderErrorPage("Link Used", "This one-time link has already been used."))
        }
    }

    @PostMapping("/{slug}/verify")
    fun verifyPassword(
        @PathVariable slug: String,
        @RequestBody body: PasswordChallengeRequest,
        request: HttpServletRequest
    ): ResponseEntity<*> {
        // Per-slug brute-force protection: max 5 attempts per minute per IP
        val ip = abuseDetectionService.extractClientIp(request)
        val bruteForceKey = "rl:pw_brute:$ip:$slug"
        val bruteForceResult = rateLimitService.checkRateLimit(bruteForceKey, 5, 60)
        if (!bruteForceResult.allowed) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", bruteForceResult.retryAfterSeconds.toString())
                .body(mapOf(
                    "success" to false,
                    "message" to "Too many password attempts — please wait ${bruteForceResult.retryAfterSeconds} seconds",
                    "retryAfter" to bruteForceResult.retryAfterSeconds
                ))
        }

        return try {
            val shortUrl = redirectService.resolveSlug(slug)

            if (shortUrl.isPrivate && !isAuthenticatedRequest(request)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(mapOf("success" to false, "message" to "Authentication required"))
            }

            if (!shortUrl.isPasswordProtected) {
                return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(shortUrl.destinationUrl))
                    .build<Any>()
            }

            if (redirectService.verifyPassword(shortUrl, body.password)) {
                redirectService.recordClick(slug, null)

                // Return JSON with redirect URL (frontend will handle the redirect)
                return ResponseEntity.ok(mapOf(
                    "success" to true,
                    "redirectUrl" to shortUrl.destinationUrl
                ))
            } else {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(mapOf("success" to false, "message" to "Incorrect password"))
            }
        } catch (ex: LinkNotFoundException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(mapOf("success" to false, "message" to "Link not found"))
        }
    }

    private fun isAuthenticatedRequest(request: HttpServletRequest): Boolean {
        val token = extractAccessToken(request)
        if (token != null && jwtTokenProvider.validateToken(token)) {
            return true
        }

        val refreshToken = request.cookies?.find { it.name == "refresh_token" }?.value
        if (!refreshToken.isNullOrBlank()) {
            val refreshSession = tokenService.findRefreshTokenByRawToken(refreshToken)
            if (refreshSession != null && refreshSession.isUsable()) {
                return true
            }
        }

        return false
    }

    private fun extractAccessToken(request: HttpServletRequest): String? {
        val header = request.getHeader("Authorization")
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7)
        }
        return request.cookies?.find { it.name == "accessToken" }?.value
    }

    /** Minimal-overhead 302 with cache-control and security headers */
    private fun fastRedirect(destination: String): ResponseEntity<Any> {
        return ResponseEntity.status(HttpStatus.FOUND)
            .location(URI.create(destination))
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .header("X-Robots-Tag", "noindex")
            .header("Referrer-Policy", "no-referrer-when-downgrade")
            .build()
    }

    private fun renderPasswordChallengePage(slug: String): String {
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Required — Golinks</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
                body { background: #191414; color: #fff; font-family: Inter, system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1rem; }
                .card { background: #242020; border: 2px solid #3A3A3A; padding: 2rem; max-width: 400px; width: 100%; }
                h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
                p { font-size: 0.875rem; color: #B3B3B3; margin-bottom: 1.5rem; }
                label { display: block; font-size: 0.875rem; font-weight: 600; color: #B3B3B3; margin-bottom: 0.375rem; }
                input { width: 100%; background: #191414; border: 2px solid #3A3A3A; color: #fff; padding: 0.625rem 1rem; font-size: 0.875rem; outline: none; }
                input:focus { border-color: #1DB954; }
                button { width: 100%; background: #1DB954; color: #191414; border: 2px solid #1DB954; padding: 0.625rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
                button:hover { background: #1AA34A; }
                button:disabled { opacity: 0.85; cursor: not-allowed; }
                .error { color: #E02424; font-size: 0.75rem; margin-top: 0.5rem; display: none; }
                .logo { color: #1DB954; font-weight: 700; font-size: 1rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem; }
                .spinner { width: 0.875rem; height: 0.875rem; border: 2px solid rgba(25, 20, 20, 0.25); border-top-color: #191414; border-radius: 9999px !important; display: none; animation: spin 0.8s linear infinite; }
                button.loading .spinner { display: inline-block; }
                @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">🔗 Golinks</div>
                <h1>Password Required</h1>
                <p>This link is password-protected. Enter the password to continue.</p>
                <form id="pwForm">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Enter password" required autofocus />
                    <div class="error" id="errorMsg">Incorrect password. Please try again.</div>
                    <button type="submit" id="submitBtn">
                        <span class="spinner" id="submitSpinner"></span>
                        <span id="submitLabel">Continue</span>
                    </button>
                </form>
            </div>
            <script>
                const form = document.getElementById('pwForm');
                const submitBtn = document.getElementById('submitBtn');
                const submitLabel = document.getElementById('submitLabel');

                function setLoading(loading) {
                    submitBtn.disabled = loading;
                    submitBtn.classList.toggle('loading', loading);
                    submitLabel.textContent = loading ? 'Checking...' : 'Continue';
                }

                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const password = document.getElementById('password').value;
                    const errorEl = document.getElementById('errorMsg');
                    errorEl.style.display = 'none';
                    setLoading(true);
                    try {
                        const res = await fetch('/go/${slug}/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ password })
                        });
                        const data = await res.json();
                        if (data.success) {
                            window.location.href = data.redirectUrl;
                        } else {
                            errorEl.textContent = data.message || 'Incorrect password';
                            errorEl.style.display = 'block';
                            setLoading(false);
                        }
                    } catch (err) {
                        errorEl.textContent = 'Something went wrong';
                        errorEl.style.display = 'block';
                        setLoading(false);
                    }
                });
            </script>
        </body>
        </html>
        """.trimIndent()
    }

    private fun renderErrorPage(title: String, message: String): String {
        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>$title — Golinks</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; border-radius: 0 !important; }
                body { background: #191414; color: #fff; font-family: Inter, system-ui, sans-serif; display: flex; align-items: center; justify-center; min-height: 100vh; padding: 1rem; }
                .card { background: #242020; border: 2px solid #3A3A3A; padding: 2rem; max-width: 400px; width: 100%; text-align: center; }
                h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
                p { font-size: 0.875rem; color: #B3B3B3; margin-bottom: 1.5rem; }
                a { display: inline-block; background: #1DB954; color: #191414; border: 2px solid #1DB954; padding: 0.625rem 1.5rem; font-size: 0.875rem; font-weight: 700; text-decoration: none; }
                a:hover { background: #1AA34A; }
                .logo { color: #1DB954; font-weight: 700; font-size: 1rem; margin-bottom: 1.5rem; }
            </style>
        </head>
        <body>
            <div class="card">
                <div class="logo">🔗 Golinks</div>
                <h1>$title</h1>
                <p>$message</p>
                <a href="/">Go Home</a>
            </div>
        </body>
        </html>
        """.trimIndent()
    }
}

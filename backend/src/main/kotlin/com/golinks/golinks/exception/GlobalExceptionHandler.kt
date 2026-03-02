package com.golinks.golinks.exception

import com.golinks.golinks.dto.ApiErrorResponse
import com.golinks.golinks.dto.FieldError
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.security.core.AuthenticationException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.format.DateTimeParseException

@RestControllerAdvice
class GlobalExceptionHandler {

    private val logger = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationErrors(ex: MethodArgumentNotValidException): ResponseEntity<ApiErrorResponse> {
        val errors = ex.bindingResult.fieldErrors.map { fieldError ->
            FieldError(
                field = fieldError.field,
                message = fieldError.defaultMessage ?: "Invalid value"
            )
        }
        return ResponseEntity.badRequest().body(
            ApiErrorResponse(
                status = 400,
                message = "Validation failed",
                errors = errors
            )
        )
    }

    @ExceptionHandler(DuplicateEmailException::class)
    fun handleDuplicateEmail(ex: DuplicateEmailException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiErrorResponse(
                status = 409,
                message = ex.message ?: "Email already registered",
                errors = listOf(FieldError("email", "Email already registered"))
            )
        )
    }

    @ExceptionHandler(InvalidCredentialsException::class)
    fun handleInvalidCredentials(ex: InvalidCredentialsException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(
                status = 401,
                message = ex.message ?: "Invalid credentials"
            )
        )
    }

    @ExceptionHandler(InvalidTokenException::class)
    fun handleInvalidToken(ex: InvalidTokenException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(
                status = 401,
                message = ex.message ?: "Invalid or expired token"
            )
        )
    }

    @ExceptionHandler(TokenReusedException::class)
    fun handleTokenReuse(ex: TokenReusedException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(
                status = 401,
                message = ex.message ?: "Security violation detected"
            )
        )
    }

    @ExceptionHandler(AccountLockedException::class)
    fun handleAccountLocked(ex: AccountLockedException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            ApiErrorResponse(
                status = 403,
                message = ex.message ?: "Account is locked"
            )
        )
    }

    @ExceptionHandler(EmailNotVerifiedException::class)
    fun handleEmailNotVerified(ex: EmailNotVerifiedException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
            ApiErrorResponse(
                status = 403,
                message = ex.message ?: "Email not verified"
            )
        )
    }

    @ExceptionHandler(AuthMethodRequiredException::class)
    fun handleAuthMethodRequired(ex: AuthMethodRequiredException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(
                status = 400,
                message = ex.message ?: "At least one authentication method must remain"
            )
        )
    }

    @ExceptionHandler(UserNotFoundException::class)
    fun handleUserNotFound(ex: UserNotFoundException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(
                status = 404,
                message = ex.message ?: "User not found"
            )
        )
    }

    @ExceptionHandler(LinkNotFoundException::class)
    fun handleLinkNotFound(ex: LinkNotFoundException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(
                status = 404,
                message = ex.message ?: "Link not found"
            )
        )
    }

    @ExceptionHandler(DuplicateSlugException::class)
    fun handleDuplicateSlug(ex: DuplicateSlugException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiErrorResponse(
                status = 409,
                message = ex.message ?: "A link with this slug already exists",
                errors = listOf(FieldError("slug", "Slug already taken"))
            )
        )
    }

    @ExceptionHandler(OAuthProviderException::class)
    fun handleOAuthProvider(ex: OAuthProviderException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(
                status = 400,
                message = ex.message ?: "OAuth provider error"
            )
        )
    }

    @ExceptionHandler(LinkExpiredException::class)
    fun handleLinkExpired(ex: LinkExpiredException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.GONE).body(
            ApiErrorResponse(
                status = 410,
                message = ex.message ?: "This link has expired"
            )
        )
    }

    @ExceptionHandler(LinkConsumedException::class)
    fun handleLinkConsumed(ex: LinkConsumedException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.GONE).body(
            ApiErrorResponse(
                status = 410,
                message = ex.message ?: "This one-time link has already been used"
            )
        )
    }

    @ExceptionHandler(MaliciousUrlException::class)
    fun handleMaliciousUrl(ex: MaliciousUrlException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(
                status = 400,
                message = ex.message ?: "URL flagged as malicious"
            )
        )
    }

    @ExceptionHandler(BulkOperationNotFoundException::class)
    fun handleBulkOperationNotFound(ex: BulkOperationNotFoundException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiErrorResponse(
                status = 404,
                message = ex.message ?: "Bulk operation not found"
            )
        )
    }

    @ExceptionHandler(RateLimitExceededException::class)
    fun handleRateLimitExceeded(ex: RateLimitExceededException): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header("Retry-After", ex.retryAfterSeconds.toString())
            .body(mapOf(
                "status" to 429,
                "message" to (ex.message ?: "Too many requests — please try again later"),
                "retryAfter" to ex.retryAfterSeconds
            ))
    }

    @ExceptionHandler(LinkPasswordRequiredException::class)
    fun handleLinkPasswordRequired(ex: LinkPasswordRequiredException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(
                status = 401,
                message = ex.message ?: "This link requires a password"
            )
        )
    }

    @ExceptionHandler(DateTimeParseException::class)
    fun handleDateTimeParse(ex: DateTimeParseException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(
                status = 400,
                message = "Invalid date format. Use ISO-8601 (e.g. 2026-12-31T23:59:59Z)"
            )
        )
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgument(ex: IllegalArgumentException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ApiErrorResponse(
                status = 400,
                message = ex.message ?: "Invalid request parameter"
            )
        )
    }

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleDataIntegrityViolation(ex: DataIntegrityViolationException): ResponseEntity<ApiErrorResponse> {
        logger.warn("Data integrity violation: ${ex.message}")
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
            ApiErrorResponse(
                status = 409,
                message = "Data conflict — the resource may already exist"
            )
        )
    }

    @ExceptionHandler(BadCredentialsException::class)
    fun handleBadCredentials(ex: BadCredentialsException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(
                status = 401,
                message = "Invalid email or password"
            )
        )
    }

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthenticationException(ex: AuthenticationException): ResponseEntity<ApiErrorResponse> {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
            ApiErrorResponse(
                status = 401,
                message = "Authentication failed"
            )
        )
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(ex: Exception): ResponseEntity<ApiErrorResponse> {
        logger.error("Unhandled exception", ex)
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ApiErrorResponse(
                status = 500,
                message = "An unexpected error occurred"
            )
        )
    }
}

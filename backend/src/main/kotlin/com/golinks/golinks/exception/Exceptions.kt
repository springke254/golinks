package com.golinks.golinks.exception

class DuplicateEmailException(message: String = "Email already registered") : RuntimeException(message)

class InvalidTokenException(message: String = "Invalid or expired token") : RuntimeException(message)

class AccountLockedException(message: String = "Account is locked") : RuntimeException(message)

class InvalidCredentialsException(message: String = "Invalid email or password") : RuntimeException(message)

class AuthMethodRequiredException(message: String = "At least one authentication method must remain") : RuntimeException(message)

class TokenReusedException(message: String = "Token reuse detected — all sessions revoked") : RuntimeException(message)

class OAuthProviderException(message: String = "OAuth provider error") : RuntimeException(message)

class UserNotFoundException(message: String = "User not found") : RuntimeException(message)

class EmailNotVerifiedException(message: String = "Email not verified") : RuntimeException(message)

class LinkNotFoundException(message: String = "Link not found") : RuntimeException(message)

class DuplicateSlugException(message: String = "A link with this slug already exists") : RuntimeException(message)

class LinkExpiredException(message: String = "This link has expired") : RuntimeException(message)

class LinkPasswordRequiredException(message: String = "This link requires a password") : RuntimeException(message)

class LinkConsumedException(message: String = "This one-time link has already been used") : RuntimeException(message)

class MaliciousUrlException(message: String = "The provided URL has been flagged as potentially malicious") : RuntimeException(message)

class BulkOperationNotFoundException(message: String = "Bulk operation not found") : RuntimeException(message)

class RateLimitExceededException(
    message: String = "Too many requests — please try again later",
    val retryAfterSeconds: Long = 60
) : RuntimeException(message)

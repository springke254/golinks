package com.golinks.golinks.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.stereotype.Component

@Component
@ConfigurationProperties(prefix = "app.jwt")
class JwtConfig {
    var keystoreLocation: String = "classpath:keys/jwt.p12"
    var keystorePassword: String = "golinks123"
    var keyAlias: String = "golinks-jwt"
    var keyPassword: String = "golinks123"
    var accessTokenExpirationMs: Long = 900000      // 15 minutes
    var refreshTokenExpirationMs: Long = 604800000   // 7 days
    var issuer: String = "golinks"
}

package com.golinks.golinks.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@ConfigurationProperties(prefix = "ratelimit")
class RateLimitProperties {

    /** Whether rate limiting is enabled globally */
    var enabled: Boolean = true

    /** Auth endpoints (login, signup, forgot-password): tight limits */
    var auth: EndpointLimit = EndpointLimit(maxRequests = 20, windowSeconds = 60)

    /** Link creation (POST /api/v1/links) */
    var linkCreate: EndpointLimit = EndpointLimit(maxRequests = 30, windowSeconds = 60)

    /** Redirect endpoint (GET /go/{slug}) */
    var redirect: EndpointLimit = EndpointLimit(maxRequests = 120, windowSeconds = 60)

    /** Password verification for protected links */
    var passwordVerify: EndpointLimit = EndpointLimit(maxRequests = 5, windowSeconds = 60)

    /** Default limit for all other endpoints */
    var default: EndpointLimit = EndpointLimit(maxRequests = 200, windowSeconds = 60)

    /** Suspicious client penalty — applied when abuse is detected */
    var suspicious: EndpointLimit = EndpointLimit(maxRequests = 10, windowSeconds = 60)

    class EndpointLimit {
        var maxRequests: Int = 60
        var windowSeconds: Long = 60

        constructor()
        constructor(maxRequests: Int, windowSeconds: Long) {
            this.maxRequests = maxRequests
            this.windowSeconds = windowSeconds
        }
    }
}

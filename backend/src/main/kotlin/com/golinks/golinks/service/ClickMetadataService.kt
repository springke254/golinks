package com.golinks.golinks.service

import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.security.MessageDigest

data class ClickMetadata(
    val visitorId: String?,
    val osName: String,
    val browserName: String,
    val deviceType: String,
    val country: String? = null,
    val region: String? = null,
    val city: String? = null
)

@Service
class ClickMetadataService {

    fun enrich(ip: String?, userAgent: String?, acceptLanguage: String?): ClickMetadata {
        return ClickMetadata(
            visitorId = computeVisitorId(ip, userAgent),
            osName = detectOs(userAgent),
            browserName = detectBrowser(userAgent),
            deviceType = detectDeviceType(userAgent),
            country = detectCountry(acceptLanguage),
            region = null,
            city = null
        )
    }

    private fun computeVisitorId(ip: String?, userAgent: String?): String? {
        if (ip.isNullOrBlank() && userAgent.isNullOrBlank()) return null
        val normalizedIp = ip?.trim()?.lowercase().orEmpty()
        val normalizedUa = userAgent?.trim()?.lowercase().orEmpty().take(256)
        val fingerprint = "$normalizedIp|$normalizedUa"
        val digest = MessageDigest.getInstance("SHA-256").digest(fingerprint.toByteArray(StandardCharsets.UTF_8))
        return digest.joinToString(separator = "") { "%02x".format(it) }.take(40)
    }

    private fun detectOs(userAgent: String?): String {
        val ua = userAgent?.lowercase().orEmpty()
        return when {
            ua.contains("windows") -> "Windows"
            ua.contains("iphone") || ua.contains("ipad") || ua.contains("ios") -> "iOS"
            ua.contains("mac os x") || ua.contains("macintosh") -> "macOS"
            ua.contains("android") -> "Android"
            ua.contains("cros") || ua.contains("chromebook") -> "Chrome OS"
            ua.contains("linux") -> "Linux"
            else -> "Other"
        }
    }

    private fun detectBrowser(userAgent: String?): String {
        val ua = userAgent?.lowercase().orEmpty()
        return when {
            ua.contains("edg/") -> "Edge"
            ua.contains("opr/") || ua.contains("opera") -> "Opera"
            ua.contains("firefox/") -> "Firefox"
            ua.contains("chrome/") && !ua.contains("edg/") && !ua.contains("opr/") -> "Chrome"
            ua.contains("safari/") && !ua.contains("chrome/") -> "Safari"
            ua.contains("msie") || ua.contains("trident") -> "Internet Explorer"
            else -> "Other"
        }
    }

    private fun detectDeviceType(userAgent: String?): String {
        val ua = userAgent?.lowercase().orEmpty()
        return when {
            ua.contains("bot") || ua.contains("spider") || ua.contains("crawl") || ua.contains("headless") -> "Bot"
            ua.contains("ipad") || ua.contains("tablet") || ua.contains("kindle") || ua.contains("silk") -> "Tablet"
            ua.contains("mobile") || ua.contains("iphone") || ua.contains("android") -> "Mobile"
            else -> "Desktop"
        }
    }

    private fun detectCountry(acceptLanguage: String?): String? {
        if (acceptLanguage.isNullOrBlank()) return null
        val primary = acceptLanguage
            .split(',')
            .firstOrNull()
            ?.substringBefore(';')
            ?.trim()
            .orEmpty()
        if (primary.isBlank()) return null

        val parts = primary.split('-', '_')
        val countryPart = if (parts.size >= 2) parts[1] else return null
        return countryPart
            .uppercase()
            .take(2)
            .takeIf { it.length == 2 && it.all { char -> char in 'A'..'Z' } }
    }
}

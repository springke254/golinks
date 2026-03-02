package com.golinks.golinks.security

import com.golinks.golinks.config.JwtConfig
import io.jsonwebtoken.Claims
import io.jsonwebtoken.Jwts
import org.slf4j.LoggerFactory
import org.springframework.core.io.ResourceLoader
import org.springframework.stereotype.Component
import java.security.KeyStore
import java.security.PrivateKey
import java.security.PublicKey
import java.security.interfaces.RSAPublicKey
import java.util.*

@Component
class JwtTokenProvider(
    private val jwtConfig: JwtConfig,
    private val resourceLoader: ResourceLoader
) {

    private val logger = LoggerFactory.getLogger(JwtTokenProvider::class.java)

    private val keyPair: Pair<PrivateKey, PublicKey> by lazy {
        loadKeyPair()
    }

    val privateKey: PrivateKey get() = keyPair.first
    val publicKey: PublicKey get() = keyPair.second

    private fun loadKeyPair(): Pair<PrivateKey, PublicKey> {
        val resource = resourceLoader.getResource(jwtConfig.keystoreLocation)
        val keyStore = KeyStore.getInstance("PKCS12")
        resource.inputStream.use { inputStream ->
            keyStore.load(inputStream, jwtConfig.keystorePassword.toCharArray())
        }
        val privateKey = keyStore.getKey(jwtConfig.keyAlias, jwtConfig.keyPassword.toCharArray()) as PrivateKey
        val certificate = keyStore.getCertificate(jwtConfig.keyAlias)
        val publicKey = certificate.publicKey
        return Pair(privateKey, publicKey)
    }

    fun generateAccessToken(userId: UUID, email: String): String {
        val now = Date()
        val expiry = Date(now.time + jwtConfig.accessTokenExpirationMs)

        return Jwts.builder()
            .subject(userId.toString())
            .claim("email", email)
            .issuer(jwtConfig.issuer)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(privateKey, Jwts.SIG.RS256)
            .compact()
    }

    fun validateToken(token: String): Boolean {
        return try {
            val claims = parseToken(token)
            !claims.expiration.before(Date())
        } catch (ex: Exception) {
            logger.debug("JWT validation failed: ${ex.message}")
            false
        }
    }

    fun parseToken(token: String): Claims {
        return Jwts.parser()
            .verifyWith(publicKey as RSAPublicKey)
            .requireIssuer(jwtConfig.issuer)
            .build()
            .parseSignedClaims(token)
            .payload
    }

    fun getUserIdFromToken(token: String): UUID {
        val claims = parseToken(token)
        return UUID.fromString(claims.subject)
    }

    fun getEmailFromToken(token: String): String {
        val claims = parseToken(token)
        return claims["email"] as String
    }

    fun getAccessTokenExpirationMs(): Long = jwtConfig.accessTokenExpirationMs
}

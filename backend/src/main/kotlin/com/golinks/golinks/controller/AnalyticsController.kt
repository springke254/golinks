package com.golinks.golinks.controller

import com.golinks.golinks.dto.*
import com.golinks.golinks.service.AnalyticsService
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID

@RestController
@RequestMapping("/api/v1/analytics")
class AnalyticsController(
    private val analyticsService: AnalyticsService
) {

    @GetMapping("/summary")
    fun getSummary(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?
    ): ResponseEntity<AnalyticsSummaryResponse> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(analyticsService.getSummary(userId, fromInstant, toInstant))
    }

    @GetMapping("/timeseries")
    fun getTimeSeries(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?
    ): ResponseEntity<TimeSeriesResponse> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(analyticsService.getTimeSeries(userId, fromInstant, toInstant))
    }

    @GetMapping("/referrers")
    fun getTopReferrers(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(defaultValue = "10") limit: Int
    ): ResponseEntity<List<ReferrerResponse>> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(analyticsService.getTopReferrers(userId, fromInstant, toInstant, limit.coerceIn(1, 50)))
    }

    @GetMapping("/top-links")
    fun getTopLinks(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(defaultValue = "10") limit: Int
    ): ResponseEntity<List<TopLinkResponse>> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(analyticsService.getTopLinks(userId, fromInstant, toInstant, limit.coerceIn(1, 50)))
    }

    private fun parseDateRange(from: String?, to: String?): Pair<Instant, Instant> {
        val toInstant = if (!to.isNullOrBlank()) {
            try { Instant.parse(to) } catch (e: Exception) { Instant.now() }
        } else {
            Instant.now()
        }
        val fromInstant = if (!from.isNullOrBlank()) {
            try { Instant.parse(from) } catch (e: Exception) { toInstant.minus(30, ChronoUnit.DAYS) }
        } else {
            toInstant.minus(30, ChronoUnit.DAYS)
        }
        return Pair(fromInstant, toInstant)
    }

    private fun getCurrentUserId(): UUID {
        val authentication = SecurityContextHolder.getContext().authentication
        val principal = authentication?.principal as? String
            ?: throw com.golinks.golinks.exception.InvalidCredentialsException("Authentication required")
        return try {
            UUID.fromString(principal)
        } catch (ex: IllegalArgumentException) {
            throw com.golinks.golinks.exception.InvalidCredentialsException("Invalid authentication token")
        }
    }
}

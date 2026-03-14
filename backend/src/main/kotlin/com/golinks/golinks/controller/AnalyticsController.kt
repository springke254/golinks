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

    /**
     * Receives batched Core Web Vitals telemetry from the frontend.
     * Uses navigator.sendBeacon() which cannot attach auth headers,
     * so this endpoint is publicly accessible (permitAll in SecurityConfig).
     */
    @PostMapping("/telemetry")
    fun receiveTelemetry(@RequestBody metrics: List<Map<String, Any>>): ResponseEntity<Void> {
        // Accept silently — telemetry data can be processed async if needed
        return ResponseEntity.ok().build()
    }

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

    @GetMapping("/heatmap/availability")
    fun getHeatmapAvailability(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?
    ): ResponseEntity<HeatmapAvailabilityResponse> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(analyticsService.getHeatmapAvailability(userId, fromInstant, toInstant))
    }

    @GetMapping("/heatmap")
    fun getHeatmap(
        @RequestParam dimension: String,
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(required = false) slug: String?,
        @RequestParam(defaultValue = "25") limit: Int
    ): ResponseEntity<HeatmapResponse> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(
            analyticsService.getHeatmap(
                userId = userId,
                dimension = dimension,
                from = fromInstant,
                to = toInstant,
                slug = slug,
                limit = limit.coerceIn(1, 100)
            )
        )
    }

    @GetMapping("/sessions")
    fun getSessions(
        @RequestParam(required = false) from: String?,
        @RequestParam(required = false) to: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") limit: Int
    ): ResponseEntity<PaginatedSessionsResponse> {
        val userId = getCurrentUserId()
        val (fromInstant, toInstant) = parseDateRange(from, to)
        return ResponseEntity.ok(analyticsService.getSessions(userId, fromInstant, toInstant, page, limit))
    }

    @GetMapping("/sessions/{sessionId}/events")
    fun getSessionEvents(
        @PathVariable sessionId: UUID,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") limit: Int
    ): ResponseEntity<SessionEventsResponse> {
        val userId = getCurrentUserId()
        return ResponseEntity.ok(analyticsService.getSessionEvents(userId, sessionId, page, limit))
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
        val username = (authentication?.principal as? org.springframework.security.core.userdetails.UserDetails)?.username
            ?: throw com.golinks.golinks.exception.InvalidCredentialsException("Authentication required")
        return try {
            UUID.fromString(username)
        } catch (ex: IllegalArgumentException) {
            throw com.golinks.golinks.exception.InvalidCredentialsException("Invalid authentication token")
        }
    }
}

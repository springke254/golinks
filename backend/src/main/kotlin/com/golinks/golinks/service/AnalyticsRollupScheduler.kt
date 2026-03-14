package com.golinks.golinks.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class AnalyticsRollupScheduler(
    private val analyticsAggregationService: AnalyticsAggregationService,
    @Value("\${app.analytics.rollup-enabled:true}")
    private val rollupEnabled: Boolean,
    @Value("\${app.analytics.rollup-window-hours:72}")
    private val rollupWindowHours: Long
) {

    @Scheduled(fixedDelayString = "\${app.analytics.rollup-fixed-delay-ms:300000}")
    fun refreshRecentRollups() {
        if (!rollupEnabled) return
        val to = Instant.now()
        val from = to.minus(rollupWindowHours, ChronoUnit.HOURS)
        analyticsAggregationService.rebuildRange(from, to)
    }
}

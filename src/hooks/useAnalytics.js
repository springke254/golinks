import { useQuery } from '@tanstack/react-query';
import * as analyticsService from '../services/analyticsService';

const ANALYTICS_REFETCH_INTERVAL_MS = 15_000;

function getWsId() {
  return localStorage.getItem('golinks_active_workspace_id') || null;
}

function normalizeFilterValue(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : undefined;
}

function defaultQueryOptions(enabled) {
  return {
    staleTime: 60_000,
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    placeholderData: (previousData) => previousData,
    enabled,
  };
}

export function useAnalyticsSummary(from, to) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-summary', wsId, from, to],
    queryFn: () => analyticsService.getAnalyticsSummary({ from, to }),
    ...defaultQueryOptions(!!wsId),
  });
}

export function useAnalyticsTimeSeries(from, to) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-timeseries', wsId, from, to],
    queryFn: () => analyticsService.getAnalyticsTimeSeries({ from, to }),
    ...defaultQueryOptions(!!wsId),
  });
}

export function useAnalyticsReferrers(from, to, limit = 10) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-referrers', wsId, from, to, limit],
    queryFn: () => analyticsService.getAnalyticsReferrers({ from, to, limit }),
    ...defaultQueryOptions(!!wsId),
  });
}

export function useAnalyticsTopLinks(from, to, limit = 10) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-top-links', wsId, from, to, limit],
    queryFn: () => analyticsService.getAnalyticsTopLinks({ from, to, limit }),
    ...defaultQueryOptions(!!wsId),
  });
}

export function useAnalyticsHeatmapAvailability(from, to) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-heatmap-availability', wsId, from, to],
    queryFn: () => analyticsService.getAnalyticsHeatmapAvailability({ from, to }),
    ...defaultQueryOptions(!!wsId),
  });
}

export function useAnalyticsHeatmapOptions(from, to, filters = {}, limit = 50, enabled = true) {
  const wsId = getWsId();

  const continent = normalizeFilterValue(filters.continent);
  const country = normalizeFilterValue(filters.country);
  const os = normalizeFilterValue(filters.os);
  const device = normalizeFilterValue(filters.device);
  const slug = normalizeFilterValue(filters.slug);

  return useQuery({
    queryKey: [
      'analytics-heatmap-options',
      wsId,
      from,
      to,
      slug || null,
      continent || null,
      country || null,
      os || null,
      device || null,
      limit,
    ],
    queryFn: () =>
      analyticsService.getAnalyticsHeatmapOptions({
        from,
        to,
        ...(slug ? { slug } : {}),
        ...(continent ? { continent } : {}),
        ...(country ? { country } : {}),
        ...(os ? { os } : {}),
        ...(device ? { device } : {}),
        limit,
      }),
    ...defaultQueryOptions(!!wsId && enabled),
  });
}

export function useAnalyticsHeatmap(dimension, from, to, options = {}) {
  const wsId = getWsId();

  const slug = normalizeFilterValue(options.slug);
  const continent = normalizeFilterValue(options.continent);
  const country = normalizeFilterValue(options.country);
  const os = normalizeFilterValue(options.os);
  const device = normalizeFilterValue(options.device);
  const granularity = normalizeFilterValue(options.granularity) || 'auto';
  const resolution = normalizeFilterValue(options.resolution) || 'standard';
  const limit = options.limit ?? 25;
  const enabled = options.enabled !== false;

  return useQuery({
    queryKey: [
      'analytics-heatmap',
      wsId,
      dimension,
      from,
      to,
      slug || null,
      continent || null,
      country || null,
      os || null,
      device || null,
      granularity,
      resolution,
      limit,
    ],
    queryFn: () =>
      analyticsService.getAnalyticsHeatmap({
        dimension,
        from,
        to,
        ...(slug ? { slug } : {}),
        ...(continent ? { continent } : {}),
        ...(country ? { country } : {}),
        ...(os ? { os } : {}),
        ...(device ? { device } : {}),
        granularity,
        resolution,
        limit,
      }),
    ...defaultQueryOptions(!!wsId && !!dimension && enabled),
  });
}

export function useAnalyticsSessions(from, to, page = 0, limit = 10) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-sessions', wsId, from, to, page, limit],
    queryFn: () => analyticsService.getAnalyticsSessions({ from, to, page, limit }),
    ...defaultQueryOptions(!!wsId),
  });
}

export function useAnalyticsSessionEvents(sessionId, page = 0, limit = 20, enabled = true) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-session-events', wsId, sessionId, page, limit],
    queryFn: () => analyticsService.getAnalyticsSessionEvents(sessionId, { page, limit }),
    ...defaultQueryOptions(!!wsId && !!sessionId && enabled),
  });
}

export function useAnalyticsLinkSparklines(from, to, slugs = [], options = {}) {
  const wsId = getWsId();
  const normalizedSlugs = Array.from(
    new Set((slugs || []).map((slug) => String(slug || '').trim()).filter(Boolean))
  ).sort();

  const granularity = normalizeFilterValue(options.granularity) || 'daily';
  const enabled = options.enabled !== false;

  return useQuery({
    queryKey: [
      'analytics-link-sparklines',
      wsId,
      from,
      to,
      granularity,
      normalizedSlugs,
    ],
    queryFn: () =>
      analyticsService.getAnalyticsLinkSparklines({
        from,
        to,
        slugs: normalizedSlugs,
        granularity,
      }),
    ...defaultQueryOptions(!!wsId && enabled && normalizedSlugs.length > 0),
  });
}

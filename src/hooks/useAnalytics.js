import { useQuery } from '@tanstack/react-query';
import * as analyticsService from '../services/analyticsService';

const ANALYTICS_REFETCH_INTERVAL_MS = 15_000;

// Helper: read active workspace ID for scoped query keys
function getWsId() {
  return localStorage.getItem('golinks_active_workspace_id') || null;
}

export function useAnalyticsSummary(from, to) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-summary', wsId, from, to],
    queryFn: () => analyticsService.getAnalyticsSummary({ from, to }),
    staleTime: 60_000,
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!wsId,
  });
}

export function useAnalyticsTimeSeries(from, to) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-timeseries', wsId, from, to],
    queryFn: () => analyticsService.getAnalyticsTimeSeries({ from, to }),
    staleTime: 60_000,
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!wsId,
  });
}

export function useAnalyticsReferrers(from, to, limit = 10) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-referrers', wsId, from, to, limit],
    queryFn: () => analyticsService.getAnalyticsReferrers({ from, to, limit }),
    staleTime: 60_000,
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!wsId,
  });
}

export function useAnalyticsTopLinks(from, to, limit = 10) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['analytics-top-links', wsId, from, to, limit],
    queryFn: () => analyticsService.getAnalyticsTopLinks({ from, to, limit }),
    staleTime: 60_000,
    refetchInterval: ANALYTICS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: !!wsId,
  });
}

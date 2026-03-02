import { useQuery } from '@tanstack/react-query';
import * as analyticsService from '../services/analyticsService';

export function useAnalyticsSummary(from, to) {
  return useQuery({
    queryKey: ['analytics-summary', from, to],
    queryFn: () => analyticsService.getAnalyticsSummary({ from, to }),
    staleTime: 60_000,
  });
}

export function useAnalyticsTimeSeries(from, to) {
  return useQuery({
    queryKey: ['analytics-timeseries', from, to],
    queryFn: () => analyticsService.getAnalyticsTimeSeries({ from, to }),
    staleTime: 60_000,
  });
}

export function useAnalyticsReferrers(from, to, limit = 10) {
  return useQuery({
    queryKey: ['analytics-referrers', from, to, limit],
    queryFn: () => analyticsService.getAnalyticsReferrers({ from, to, limit }),
    staleTime: 60_000,
  });
}

export function useAnalyticsTopLinks(from, to, limit = 10) {
  return useQuery({
    queryKey: ['analytics-top-links', from, to, limit],
    queryFn: () => analyticsService.getAnalyticsTopLinks({ from, to, limit }),
    staleTime: 60_000,
  });
}

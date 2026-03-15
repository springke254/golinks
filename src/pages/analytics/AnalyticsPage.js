import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  MousePointerClick,
  Users,
  TrendingUp,
  Trophy,
  ExternalLink,
  Globe,
  Monitor,
  Apple,
  Smartphone,
  Tablet,
  Terminal,
  Bot,
  Clock3,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  useAnalyticsSummary,
  useAnalyticsTimeSeries,
  useAnalyticsReferrers,
  useAnalyticsTopLinks,
  useAnalyticsHeatmapAvailability,
  useAnalyticsHeatmapOptions,
  useAnalyticsHeatmap,
  useAnalyticsSessions,
  useAnalyticsSessionEvents,
} from '../../hooks/useAnalytics';
import * as analyticsService from '../../services/analyticsService';
import Skeleton from '../../components/ui/Skeleton';

dayjs.extend(relativeTime);

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: '180d', days: 180 },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-elevated border-2 border-border-strong px-3 py-2 text-xs">
      <p className="text-text-secondary font-medium">{label}</p>
      <p className="text-primary font-bold mt-0.5">{payload[0].value} clicks</p>
    </div>
  );
}

function formatDuration(seconds = 0) {
  const safe = Number(seconds) || 0;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function getOsIcon(osName) {
  const value = String(osName || '').toLowerCase();
  if (value.includes('bot') || value.includes('crawl') || value.includes('spider')) return Bot;
  if (value.includes('ios') || value.includes('mac')) return Apple;
  if (value.includes('android')) return Smartphone;
  if (value.includes('windows')) return Monitor;
  if (
    value.includes('linux') ||
    value.includes('ubuntu') ||
    value.includes('debian') ||
    value.includes('fedora') ||
    value.includes('chrome os')
  ) {
    return Terminal;
  }
  return Globe;
}

function getDeviceIcon(deviceType) {
  const value = String(deviceType || '').toLowerCase();
  if (value.includes('bot')) return Bot;
  if (value.includes('mobile')) return Smartphone;
  if (value.includes('tablet')) return Tablet;
  if (value.includes('desktop')) return Monitor;
  return Globe;
}

function normalizeFilterValue(value) {
  const normalized = String(value || '').trim();
  return normalized ? normalized : undefined;
}

function getIdleScheduler() {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return {
      schedule: (cb) => window.requestIdleCallback(cb, { timeout: 1200 }),
      cancel: (id) => window.cancelIdleCallback(id),
    };
  }

  return {
    schedule: (cb) => setTimeout(cb, 250),
    cancel: (id) => clearTimeout(id),
  };
}

function FreshnessBadge({ updatedAt, fallback = 'Warming up' }) {
  const parsed = updatedAt ? dayjs(updatedAt) : null;
  const isValid = !!parsed && parsed.isValid();
  const label = isValid ? `Updated ${parsed.fromNow()}` : fallback;

  return (
    <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-text-muted border border-border-strong bg-dark-elevated">
      {label}
    </span>
  );
}

export default function AnalyticsPage() {
  const SESSIONS_PAGE_SIZE = 8;
  const SESSION_EVENTS_PAGE_SIZE = 20;
  const queryClient = useQueryClient();

  const [rangeDays, setRangeDays] = useState(30);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionsPage, setSessionsPage] = useState(0);
  const [sessionEventsPage, setSessionEventsPage] = useState(0);
  const [globalFilters, setGlobalFilters] = useState({
    continent: '',
    country: '',
    os: '',
    device: '',
  });
  const [isCompactResolution, setIsCompactResolution] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  const { from, to } = useMemo(() => {
    const toDate = dayjs().endOf('day').toISOString();
    const fromDate = dayjs().subtract(rangeDays, 'day').startOf('day').toISOString();
    return { from: fromDate, to: toDate };
  }, [rangeDays]);

  const heatmapFilters = useMemo(
    () => ({
      continent: normalizeFilterValue(globalFilters.continent),
      country: normalizeFilterValue(globalFilters.country),
      os: normalizeFilterValue(globalFilters.os),
      device: normalizeFilterValue(globalFilters.device),
    }),
    [globalFilters]
  );

  const heatmapGranularity = useMemo(() => (rangeDays >= 75 ? 'daily' : 'auto'), [rangeDays]);
  const heatmapResolution = isCompactResolution ? 'compact' : 'standard';

  const {
    data: summary,
    isLoading: summaryLoading,
    dataUpdatedAt: summaryFetchedAt,
  } = useAnalyticsSummary(from, to);
  const {
    data: timeSeries,
    isLoading: tsLoading,
    dataUpdatedAt: timeSeriesFetchedAt,
  } = useAnalyticsTimeSeries(from, to);
  const {
    data: referrers,
    isLoading: refLoading,
    dataUpdatedAt: referrersFetchedAt,
  } = useAnalyticsReferrers(from, to);
  const {
    data: topLinks,
    isLoading: tlLoading,
    dataUpdatedAt: topLinksFetchedAt,
  } = useAnalyticsTopLinks(from, to);
  const {
    data: heatmapAvailability,
    isLoading: heatmapAvailabilityLoading,
    isFetching: heatmapAvailabilityFetching,
    dataUpdatedAt: heatmapAvailabilityFetchedAt,
  } = useAnalyticsHeatmapAvailability(from, to);
  const {
    data: heatmapOptions,
    isLoading: heatmapOptionsLoading,
    isFetching: heatmapOptionsFetching,
  } = useAnalyticsHeatmapOptions(from, to, heatmapFilters, 50, true);

  const heatmapsReady = !!heatmapAvailability?.ready;

  const {
    data: countryHeatmap,
    isLoading: countryLoading,
    isFetching: countryFetching,
    dataUpdatedAt: countryFetchedAt,
  } = useAnalyticsHeatmap('country', from, to, {
    ...heatmapFilters,
    granularity: heatmapGranularity,
    resolution: heatmapResolution,
    enabled: heatmapsReady,
  });
  const {
    data: osHeatmap,
    isLoading: osLoading,
    isFetching: osFetching,
    dataUpdatedAt: osFetchedAt,
  } = useAnalyticsHeatmap('os', from, to, {
    ...heatmapFilters,
    granularity: heatmapGranularity,
    resolution: heatmapResolution,
    enabled: heatmapsReady,
  });
  const {
    data: deviceHeatmap,
    isLoading: deviceLoading,
    isFetching: deviceFetching,
    dataUpdatedAt: deviceFetchedAt,
  } = useAnalyticsHeatmap('device', from, to, {
    ...heatmapFilters,
    granularity: heatmapGranularity,
    resolution: heatmapResolution,
    enabled: heatmapsReady,
  });
  const {
    data: sessions,
    isLoading: sessionsLoading,
    dataUpdatedAt: sessionsFetchedAt,
  } = useAnalyticsSessions(from, to, sessionsPage, SESSIONS_PAGE_SIZE);
  const {
    data: sessionEvents,
    isLoading: sessionEventsLoading,
    dataUpdatedAt: sessionEventsFetchedAt,
  } = useAnalyticsSessionEvents(
    selectedSessionId,
    sessionEventsPage,
    SESSION_EVENTS_PAGE_SIZE,
    !!selectedSessionId
  );

  const sessionItems = useMemo(() => sessions?.items || [], [sessions]);

  useEffect(() => {
    function handleResize() {
      setIsCompactResolution(window.innerWidth < 1024);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const countryKeys = new Set((heatmapOptions?.countries || []).map((entry) => entry.key));
    const continentKeys = new Set((heatmapOptions?.continents || []).map((entry) => entry.key));
    const osKeys = new Set((heatmapOptions?.os || []).map((entry) => entry.key));
    const deviceKeys = new Set((heatmapOptions?.devices || []).map((entry) => entry.key));

    setGlobalFilters((current) => {
      const next = { ...current };
      let changed = false;

      if (next.country && !countryKeys.has(next.country)) {
        next.country = '';
        changed = true;
      }
      if (next.continent && !continentKeys.has(next.continent)) {
        next.continent = '';
        changed = true;
      }
      if (next.os && !osKeys.has(next.os)) {
        next.os = '';
        changed = true;
      }
      if (next.device && !deviceKeys.has(next.device)) {
        next.device = '';
        changed = true;
      }

      return changed ? next : current;
    });
  }, [heatmapOptions]);

  useEffect(() => {
    const wsId = localStorage.getItem('golinks_active_workspace_id');
    if (!wsId) return undefined;

    const previousFrom = dayjs(from).subtract(rangeDays, 'day').toISOString();
    const previousTo = dayjs(to).subtract(rangeDays, 'day').toISOString();
    const nextFrom = dayjs(from).add(rangeDays, 'day').toISOString();
    const nextTo = dayjs(to).add(rangeDays, 'day').toISOString();

    const scheduler = getIdleScheduler();
    const taskId = scheduler.schedule(() => {
      const ranges = [
        { from: previousFrom, to: previousTo },
        { from: nextFrom, to: nextTo },
      ];

      ranges.forEach((range) => {
        queryClient.prefetchQuery({
          queryKey: ['analytics-timeseries', wsId, range.from, range.to],
          queryFn: () => analyticsService.getAnalyticsTimeSeries({ from: range.from, to: range.to }),
          staleTime: 60_000,
        });

        queryClient.prefetchQuery({
          queryKey: ['analytics-heatmap-availability', wsId, range.from, range.to],
          queryFn: () => analyticsService.getAnalyticsHeatmapAvailability({ from: range.from, to: range.to }),
          staleTime: 60_000,
        });

        ['country', 'os', 'device'].forEach((dimension) => {
          queryClient.prefetchQuery({
            queryKey: [
              'analytics-heatmap',
              wsId,
              dimension,
              range.from,
              range.to,
              null,
              heatmapFilters.continent || null,
              heatmapFilters.country || null,
              heatmapFilters.os || null,
              heatmapFilters.device || null,
              heatmapGranularity,
              heatmapResolution,
              25,
            ],
            queryFn: () =>
              analyticsService.getAnalyticsHeatmap({
                dimension,
                from: range.from,
                to: range.to,
                ...(heatmapFilters.continent ? { continent: heatmapFilters.continent } : {}),
                ...(heatmapFilters.country ? { country: heatmapFilters.country } : {}),
                ...(heatmapFilters.os ? { os: heatmapFilters.os } : {}),
                ...(heatmapFilters.device ? { device: heatmapFilters.device } : {}),
                granularity: heatmapGranularity,
                resolution: heatmapResolution,
                limit: 25,
              }),
            staleTime: 60_000,
          });
        });
      });
    });

    return () => scheduler.cancel(taskId);
  }, [
    from,
    to,
    rangeDays,
    queryClient,
    heatmapFilters.continent,
    heatmapFilters.country,
    heatmapFilters.os,
    heatmapFilters.device,
    heatmapGranularity,
    heatmapResolution,
  ]);

  useEffect(() => {
    setSessionsPage(0);
    setSessionEventsPage(0);
    setSelectedSessionId(null);
  }, [rangeDays]);

  useEffect(() => {
    if (!sessionItems.length) {
      setSelectedSessionId(null);
      return;
    }
    if (!selectedSessionId || !sessionItems.some((s) => s.id === selectedSessionId)) {
      setSelectedSessionId(sessionItems[0].id);
    }
  }, [sessionItems, selectedSessionId]);

  useEffect(() => {
    setSessionEventsPage(0);
  }, [selectedSessionId]);

  useEffect(() => {
    const totalPages = sessions?.totalPages || 0;
    if (totalPages > 0) {
      const maxPage = totalPages - 1;
      if (sessionsPage > maxPage) {
        setSessionsPage(maxPage);
      }
    }
  }, [sessions?.totalPages, sessionsPage]);

  useEffect(() => {
    const totalPages = sessionEvents?.totalPages || 0;
    if (totalPages > 0) {
      const maxPage = totalPages - 1;
      if (sessionEventsPage > maxPage) {
        setSessionEventsPage(maxPage);
      }
    }
  }, [sessionEvents?.totalPages, sessionEventsPage]);

  const chartData = useMemo(() => {
    if (!timeSeries?.data) return [];
    return timeSeries.data.map((d) => ({
      date: dayjs(d.date).format('MMM D'),
      clicks: d.clicks,
    }));
  }, [timeSeries]);

  const statCards = [
    {
      label: 'Total Clicks',
      value: summary?.totalClicks ?? 0,
      icon: MousePointerClick,
    },
    {
      label: 'Unique Visitors',
      value: summary?.uniqueVisitors ?? 0,
      icon: Users,
    },
    {
      label: 'Avg / Day',
      value: summary?.avgClicksPerDay ?? 0,
      icon: TrendingUp,
    },
    {
      label: 'Top Link',
      value: summary?.topLinkSlug ? `go/${summary.topLinkSlug}` : '—',
      icon: Trophy,
      isText: true,
    },
  ];

  const countryTotals = countryHeatmap?.totals || [];
  const osTotals = osHeatmap?.totals || [];
  const deviceTotals = deviceHeatmap?.totals || [];
  const selectedSession = useMemo(
    () => sessionItems.find((session) => session.id === selectedSessionId) || null,
    [sessionItems, selectedSessionId]
  );

  const summaryFreshness = summaryFetchedAt || null;
  const timeSeriesFreshness = timeSeriesFetchedAt || null;
  const topLinksFreshness = topLinksFetchedAt || null;
  const referrersFreshness = referrersFetchedAt || null;

  const heatmapFreshness =
    heatmapAvailability?.updatedAt ||
    heatmapAvailabilityFetchedAt ||
    countryHeatmap?.updatedAt ||
    osHeatmap?.updatedAt ||
    deviceHeatmap?.updatedAt ||
    null;

  const countryFreshness = countryHeatmap?.updatedAt || countryFetchedAt || heatmapFreshness;
  const osFreshness = osHeatmap?.updatedAt || osFetchedAt || heatmapFreshness;
  const deviceFreshness = deviceHeatmap?.updatedAt || deviceFetchedAt || heatmapFreshness;

  const sessionsFreshness = sessions?.updatedAt || sessionsFetchedAt || null;
  const sessionEventsFreshness = sessionEventsFetchedAt || null;

  const sessionsTotalPages = sessions?.totalPages || 0;
  const canPrevSessions = sessionsPage > 0;
  const canNextSessions = sessionsTotalPages > 0 && sessionsPage + 1 < sessionsTotalPages;

  const sessionEventsTotalPages = sessionEvents?.totalPages || 0;
  const canPrevSessionEvents = sessionEventsPage > 0;
  const canNextSessionEvents =
    sessionEventsTotalPages > 0 && sessionEventsPage + 1 < sessionEventsTotalPages;

  const continentOptions = heatmapOptions?.continents || [];
  const countryOptions = heatmapOptions?.countries || [];
  const osOptions = heatmapOptions?.os || [];
  const deviceOptions = heatmapOptions?.devices || [];

  const activeFilterCount = [
    globalFilters.continent,
    globalFilters.country,
    globalFilters.os,
    globalFilters.device,
  ].filter(Boolean).length;

  const heatmapsBlocked = !heatmapAvailabilityLoading && !heatmapsReady;
  const heatmapUpdating =
    heatmapAvailabilityFetching || countryFetching || osFetching || deviceFetching;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header + Range Picker */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-text-secondary mt-1">
            Track clicks, visitors, and referrers across your links.
          </p>
        </div>

        {/* Range selector */}
        <div className="flex items-center border-2 border-border-strong bg-dark-card">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`px-4 py-2 text-sm font-bold transition-colors ${
                rangeDays === opt.days
                  ? 'bg-primary text-text-inverse'
                  : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="bg-dark-card border-2 border-border-strong p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-secondary">Global Heatmap Filters</p>
          <div className="flex items-center gap-2">
            {heatmapOptionsLoading || heatmapOptionsFetching ? (
              <span className="text-[11px] text-text-muted font-semibold">Refreshing filters...</span>
            ) : null}
            {activeFilterCount > 0 ? (
              <button
                onClick={() =>
                  setGlobalFilters({
                    continent: '',
                    country: '',
                    os: '',
                    device: '',
                  })
                }
                className="px-2 py-1 text-[11px] font-semibold border border-border-strong bg-dark-elevated text-text-secondary hover:text-text-primary transition-colors"
              >
                Clear ({activeFilterCount})
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Continent
            </span>
            <select
              value={globalFilters.continent}
              onChange={(e) =>
                setGlobalFilters((current) => ({
                  ...current,
                  continent: e.target.value,
                }))
              }
              className="w-full bg-dark-elevated border-2 border-border-strong px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">All continents</option>
              {continentOptions.map((option) => (
                <option key={`continent-${option.key}`} value={option.key}>
                  {option.key} ({option.clicks.toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Country
            </span>
            <select
              value={globalFilters.country}
              onChange={(e) =>
                setGlobalFilters((current) => ({
                  ...current,
                  country: e.target.value,
                }))
              }
              className="w-full bg-dark-elevated border-2 border-border-strong px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">All countries</option>
              {countryOptions.map((option) => (
                <option key={`country-${option.key}`} value={option.key}>
                  {option.key} ({option.clicks.toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              OS
            </span>
            <select
              value={globalFilters.os}
              onChange={(e) =>
                setGlobalFilters((current) => ({
                  ...current,
                  os: e.target.value,
                }))
              }
              className="w-full bg-dark-elevated border-2 border-border-strong px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">All operating systems</option>
              {osOptions.map((option) => (
                <option key={`os-option-${option.key}`} value={option.key}>
                  {option.key} ({option.clicks.toLocaleString()})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              Device
            </span>
            <select
              value={globalFilters.device}
              onChange={(e) =>
                setGlobalFilters((current) => ({
                  ...current,
                  device: e.target.value,
                }))
              }
              className="w-full bg-dark-elevated border-2 border-border-strong px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="">All devices</option>
              {deviceOptions.map((option) => (
                <option key={`device-option-${option.key}`} value={option.key}>
                  {option.key} ({option.clicks.toLocaleString()})
                </option>
              ))}
            </select>
          </label>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-secondary">Summary</h2>
          <FreshnessBadge updatedAt={summaryFreshness} fallback="Waiting for data" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-5 bg-dark-card border-2 border-border-strong space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <Icon className="w-4 h-4 text-text-muted" />
                </div>
                {summaryLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p
                    className={`font-bold text-text-primary ${
                      stat.isText ? 'text-lg truncate' : 'text-2xl'
                    }`}
                  >
                    {typeof stat.value === 'number'
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Time-Series Chart */}
      <motion.div
        variants={item}
        className="bg-dark-card border-2 border-border-strong p-5"
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-sm font-semibold text-text-secondary">
            Clicks Over Time
          </h2>
          <FreshnessBadge updatedAt={timeSeriesFreshness} fallback="Waiting for data" />
        </div>
        {tsLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-text-muted text-sm">
            No click data for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="clickGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1DB954" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1DB954" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3A3A3A" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8A8A8A', fontSize: 11 }}
                axisLine={{ stroke: '#3A3A3A' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8A8A8A', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3A3A3A' }} />
              <Area
                type="monotone"
                dataKey="clicks"
                stroke="#1DB954"
                strokeWidth={2}
                fill="url(#clickGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Bottom Grid: Top Links + Top Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Links */}
        <motion.div
          variants={item}
          className="bg-dark-card border-2 border-border-strong p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Top Links
            </h2>
            <FreshnessBadge updatedAt={topLinksFreshness} fallback="Waiting for data" />
          </div>
          {tlLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !topLinks?.length ? (
            <p className="text-text-muted text-sm py-8 text-center">No data yet.</p>
          ) : (
            <div className="space-y-1">
              {topLinks.map((link, idx) => (
                <div
                  key={link.slug}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-dark-elevated transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-text-muted w-5 text-right">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        go/{link.slug}
                      </p>
                      {link.title && (
                        <p className="text-xs text-text-muted truncate">{link.title}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary ml-3 shrink-0">
                    {link.clicks.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Referrers */}
        <motion.div
          variants={item}
          className="bg-dark-card border-2 border-border-strong p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              Top Referrers
            </h2>
            <FreshnessBadge updatedAt={referrersFreshness} fallback="Waiting for data" />
          </div>
          {refLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : !referrers?.length ? (
            <p className="text-text-muted text-sm py-8 text-center">No data yet.</p>
          ) : (
            <div className="space-y-1">
              {referrers.map((ref) => {
                const maxCount = referrers[0]?.count || 1;
                const pct = Math.round((ref.count / maxCount) * 100);
                return (
                  <div
                    key={ref.referrer}
                    className="relative px-3 py-2.5 hover:bg-dark-elevated transition-colors"
                  >
                    {/* Bar background */}
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/10"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span className="text-sm text-text-primary truncate">
                          {ref.referrer}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-text-secondary ml-3 shrink-0">
                        {ref.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Heatmaps (pre-aggregated) */}
      <motion.div variants={item} className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Heatmaps
            </h2>
            <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-text-muted border border-border-strong bg-dark-elevated">
              {heatmapGranularity === 'daily' ? 'Daily aggregate' : 'Hourly aggregate'}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-text-muted border border-border-strong bg-dark-elevated">
              {heatmapResolution === 'compact' ? 'Compact tiles' : 'Standard tiles'}
            </span>
            {heatmapUpdating ? (
              <span className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-primary border border-primary/40 bg-primary/10">
                Updating
              </span>
            ) : null}
          </div>
          <FreshnessBadge
            updatedAt={heatmapFreshness}
            fallback={heatmapAvailability?.notReadyReason || 'Aggregates warming up'}
          />
        </div>

        {heatmapAvailabilityLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, index) => (
              <div key={`heatmap-load-${index}`} className="bg-dark-card border-2 border-border-strong p-5">
                <Skeleton className="h-5 w-24 mb-4" />
                <div className="space-y-3">
                  {[...Array(5)].map((__, rowIndex) => (
                    <Skeleton key={`heatmap-row-${index}-${rowIndex}`} className="h-9 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : heatmapsBlocked ? (
          <div className="bg-dark-card border-2 border-border-strong p-8 text-center">
            <p className="text-sm text-text-secondary font-semibold">Aggregates are still warming up</p>
            <p className="text-xs text-text-muted mt-1">
              {heatmapAvailability?.notReadyReason ||
                'Fresh windows are computed in the background. Try again in a minute.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-dark-card border-2 border-border-strong p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-text-secondary">Country Density</h3>
                <FreshnessBadge updatedAt={countryFreshness} fallback="Warming up" />
              </div>
              {countryLoading && !countryTotals.length ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : !countryTotals.length ? (
                <p className="text-text-muted text-sm py-8 text-center">
                  {activeFilterCount
                    ? 'No country heatmap data for the current filters.'
                    : 'No country heatmap data yet.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {countryTotals.map((bucket) => {
                    const max = countryTotals[0]?.clicks || 1;
                    const pct = Math.max(8, Math.round((bucket.clicks / max) * 100));
                    return (
                      <div
                        key={`country-${bucket.key}`}
                        className="relative px-3 py-2.5 hover:bg-dark-elevated transition-colors"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/10"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span className="text-sm text-text-primary truncate">{bucket.key}</span>
                          </div>
                          <span className="text-sm font-bold text-text-secondary ml-3 shrink-0">
                            {bucket.clicks.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-dark-card border-2 border-border-strong p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-text-secondary">OS Density</h3>
                <FreshnessBadge updatedAt={osFreshness} fallback="Warming up" />
              </div>
              {osLoading && !osTotals.length ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : !osTotals.length ? (
                <p className="text-text-muted text-sm py-8 text-center">
                  {activeFilterCount
                    ? 'No OS heatmap data for the current filters.'
                    : 'No OS heatmap data yet.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {osTotals.map((bucket) => {
                    const max = osTotals[0]?.clicks || 1;
                    const pct = Math.max(8, Math.round((bucket.clicks / max) * 100));
                    const Icon = getOsIcon(bucket.key);
                    return (
                      <div
                        key={`os-${bucket.key}`}
                        className="relative px-3 py-2.5 hover:bg-dark-elevated transition-colors"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/10"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span className="text-sm text-text-primary truncate">{bucket.key}</span>
                          </div>
                          <span className="text-sm font-bold text-text-secondary ml-3 shrink-0">
                            {bucket.clicks.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-dark-card border-2 border-border-strong p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-semibold text-text-secondary">Device Density</h3>
                <FreshnessBadge updatedAt={deviceFreshness} fallback="Warming up" />
              </div>
              {deviceLoading && !deviceTotals.length ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : !deviceTotals.length ? (
                <p className="text-text-muted text-sm py-8 text-center">
                  {activeFilterCount
                    ? 'No device heatmap data for the current filters.'
                    : 'No device heatmap data yet.'}
                </p>
              ) : (
                <div className="space-y-1">
                  {deviceTotals.map((bucket) => {
                    const max = deviceTotals[0]?.clicks || 1;
                    const pct = Math.max(8, Math.round((bucket.clicks / max) * 100));
                    const Icon = getDeviceIcon(bucket.key);
                    return (
                      <div
                        key={`device-${bucket.key}`}
                        className="relative px-3 py-2.5 hover:bg-dark-elevated transition-colors"
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/10"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            <span className="text-sm text-text-primary truncate">{bucket.key}</span>
                          </div>
                          <span className="text-sm font-bold text-text-secondary ml-3 shrink-0">
                            {bucket.clicks.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Session-level analytics */}
      <motion.div variants={item} className="bg-dark-card border-2 border-border-strong p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
            <Clock3 className="w-4 h-4 text-primary" />
            Session Timeline
          </h2>
          <FreshnessBadge updatedAt={sessionsFreshness} fallback="Warming up" />
        </div>

        {sessionsLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        ) : !sessionItems.length ? (
          <p className="text-text-muted text-sm py-8 text-center">No session data yet for this period.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="border-2 border-border-strong bg-dark-elevated/40 p-2 space-y-2">
              <div className="flex items-center justify-between gap-3 px-2 pt-1">
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  Sessions
                </span>
                <span className="text-xs text-text-muted">
                  {(sessions?.totalItems ?? 0).toLocaleString()} total
                </span>
              </div>

              <div className="space-y-1">
                {sessionItems.map((session) => {
                  const active = session.id === selectedSessionId;
                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`w-full text-left px-3 py-2.5 transition-colors border-2 ${
                        active
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-dark-card border-transparent hover:bg-dark-elevated'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {dayjs(session.startedAt).format('MMM D, HH:mm')} • {formatDuration(session.durationSeconds)}
                          </p>
                          <p className="text-xs text-text-muted truncate">
                            {session.entrySlug ? `go/${session.entrySlug}` : 'Entry unknown'}
                            {'  →  '}
                            {session.exitSlug ? `go/${session.exitSlug}` : 'Exit unknown'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-primary">{session.clicks.toLocaleString()}</p>
                          <p className="text-[11px] text-text-muted">clicks</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2 px-2 pt-2 border-t border-border-strong">
                <button
                  onClick={() => setSessionsPage((prev) => Math.max(0, prev - 1))}
                  disabled={!canPrevSessions}
                  className="px-2.5 py-1 text-xs font-semibold border border-border-strong bg-dark-card text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <span className="text-xs text-text-muted">
                  Page {sessionsTotalPages ? sessionsPage + 1 : 0} / {sessionsTotalPages}
                </span>
                <button
                  onClick={() => setSessionsPage((prev) => prev + 1)}
                  disabled={!canNextSessions}
                  className="px-2.5 py-1 text-xs font-semibold border border-border-strong bg-dark-card text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>

            <div className="border-2 border-border-strong bg-dark-elevated/40 p-4 space-y-3 min-h-[18rem]">
              {!selectedSession ? (
                <p className="text-sm text-text-muted">Select a session to inspect timeline events.</p>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      <span className="px-2 py-1 border border-border-strong bg-dark-card">
                        Visitor {selectedSession.visitorId?.slice(0, 8)}
                      </span>
                      <span className="px-2 py-1 border border-border-strong bg-dark-card inline-flex items-center gap-1">
                        {React.createElement(getOsIcon(selectedSession.osName), {
                          className: 'w-3.5 h-3.5',
                        })}
                        {selectedSession.osName || 'Other'}
                      </span>
                      <span className="px-2 py-1 border border-border-strong bg-dark-card inline-flex items-center gap-1">
                        {React.createElement(getDeviceIcon(selectedSession.deviceType), {
                          className: 'w-3.5 h-3.5',
                        })}
                        {selectedSession.deviceType || 'Unknown'}
                      </span>
                      <span className="px-2 py-1 border border-border-strong bg-dark-card">
                        {selectedSession.country || 'Unknown'}
                      </span>
                    </div>
                    <FreshnessBadge updatedAt={sessionEventsFreshness} fallback="Waiting for events" />
                  </div>

                  {sessionEventsLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                      ))}
                    </div>
                  ) : !sessionEvents?.items?.length ? (
                    <p className="text-sm text-text-muted py-6 text-center">No event rows in this session.</p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-auto pr-1">
                      {sessionEvents.items.map((event, idx) => (
                        <div
                          key={`${event.clickedAt}-${event.slug}-${idx}`}
                          className="px-3 py-2 bg-dark-card border border-border-strong"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-text-primary truncate">go/{event.slug}</p>
                            <p className="text-xs text-text-muted shrink-0">
                              {dayjs(event.clickedAt).format('HH:mm:ss')}
                            </p>
                          </div>
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {event.referrer || 'Direct'} • {event.osName || 'Other'} • {event.deviceType || 'Unknown'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-strong">
                    <button
                      onClick={() => setSessionEventsPage((prev) => Math.max(0, prev - 1))}
                      disabled={!canPrevSessionEvents}
                      className="px-2.5 py-1 text-xs font-semibold border border-border-strong bg-dark-card text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-text-muted">
                      Events {sessionEventsTotalPages ? sessionEventsPage + 1 : 0} / {sessionEventsTotalPages}
                    </span>
                    <button
                      onClick={() => setSessionEventsPage((prev) => prev + 1)}
                      disabled={!canNextSessionEvents}
                      className="px-2.5 py-1 text-xs font-semibold border border-border-strong bg-dark-card text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

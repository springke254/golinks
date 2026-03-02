import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  MousePointerClick,
  Users,
  TrendingUp,
  Trophy,
  ExternalLink,
  Globe,
} from 'lucide-react';
import dayjs from 'dayjs';
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
} from '../../hooks/useAnalytics';
import Skeleton from '../../components/ui/Skeleton';

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
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

export default function AnalyticsPage() {
  const [rangeDays, setRangeDays] = useState(30);

  const { from, to } = useMemo(() => {
    const toDate = dayjs().endOf('day').toISOString();
    const fromDate = dayjs().subtract(rangeDays, 'day').startOf('day').toISOString();
    return { from: fromDate, to: toDate };
  }, [rangeDays]);

  const { data: summary, isLoading: summaryLoading } = useAnalyticsSummary(from, to);
  const { data: timeSeries, isLoading: tsLoading } = useAnalyticsTimeSeries(from, to);
  const { data: referrers, isLoading: refLoading } = useAnalyticsReferrers(from, to);
  const { data: topLinks, isLoading: tlLoading } = useAnalyticsTopLinks(from, to);

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

      {/* Summary Cards */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      </motion.div>

      {/* Time-Series Chart */}
      <motion.div
        variants={item}
        className="bg-dark-card border-2 border-border-strong p-5"
      >
        <h2 className="text-sm font-semibold text-text-secondary mb-4">
          Clicks Over Time
        </h2>
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
          <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Top Links
          </h2>
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
          <h2 className="text-sm font-semibold text-text-secondary mb-4 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-primary" />
            Top Referrers
          </h2>
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
              {referrers.map((ref, idx) => {
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
    </motion.div>
  );
}

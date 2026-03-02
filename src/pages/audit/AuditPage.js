import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  User,
  Globe,
  Monitor,
  AlertTriangle,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { useAuditLogs, useAuditActions } from '../../hooks/useAudit';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';

dayjs.extend(relativeTime);

// ── Animation variants ──────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

// ── Helpers ─────────────────────────────────────────────
const ACTION_BADGE = {
  LINK_CREATED: 'success',
  LINK_UPDATED: 'warning',
  LINK_DELETED: 'danger',
  LINK_BULK_DELETED: 'danger',
  LOGIN: 'success',
  SIGNUP: 'success',
  PASSWORD_RESET: 'warning',
  OAUTH_LINK: 'neutral',
};

function actionVariant(action) {
  return ACTION_BADGE[action] ?? 'neutral';
}

function tryParseDetails(json) {
  if (!json) return null;
  try {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ── Page ────────────────────────────────────────────────
export default function AuditPage() {
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    userId: '',
  });

  const params = useMemo(() => {
    const p = { page, size: 20 };
    if (filters.action) p.action = filters.action;
    if (filters.resourceType) p.resourceType = filters.resourceType;
    if (filters.userId) p.userId = filters.userId;
    return p;
  }, [page, filters]);

  const { data, isLoading, isError, error } = useAuditLogs(params);
  const { data: actionsData } = useAuditActions();

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-primary" />
            Audit Trail
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Every sensitive action captured in a structured audit trail
          </p>
        </div>
        {data && (
          <span className="text-xs text-text-muted">
            {data.totalItems} total event{data.totalItems !== 1 ? 's' : ''}
          </span>
        )}
      </motion.div>

      {/* Filters */}
      <motion.div
        variants={item}
        className="flex flex-wrap gap-3 items-end"
      >
        {/* Action dropdown */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted flex items-center gap-1">
            <Filter className="w-3 h-3" /> Action
          </label>
          <select
            value={filters.action}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className="bg-dark-card border-2 border-border-strong text-text-primary text-sm px-3 py-2 focus:outline-none focus:border-primary min-w-[160px]"
          >
            <option value="">All actions</option>
            {actionsData?.actions?.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Resource type dropdown */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted flex items-center gap-1">
            <Monitor className="w-3 h-3" /> Resource
          </label>
          <select
            value={filters.resourceType}
            onChange={(e) => handleFilterChange('resourceType', e.target.value)}
            className="bg-dark-card border-2 border-border-strong text-text-primary text-sm px-3 py-2 focus:outline-none focus:border-primary min-w-[140px]"
          >
            <option value="">All types</option>
            {actionsData?.resourceTypes?.map((rt) => (
              <option key={rt} value={rt}>
                {rt}
              </option>
            ))}
          </select>
        </div>

        {/* User ID search */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-text-muted flex items-center gap-1">
            <User className="w-3 h-3" /> User ID
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              placeholder="Filter by user…"
              value={filters.userId}
              onChange={(e) => handleFilterChange('userId', e.target.value)}
              className="bg-dark-card border-2 border-border-strong text-text-primary text-sm pl-8 pr-3 py-2 focus:outline-none focus:border-primary w-[220px] placeholder-text-muted"
            />
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        variants={item}
        className="bg-dark-card border-2 border-border-strong overflow-hidden"
      >
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 text-danger">
            <AlertTriangle className="w-10 h-10 mb-3 opacity-70" />
            <p className="font-medium">Failed to load audit events</p>
            <p className="text-xs mt-1 text-text-muted">
              {error?.response?.data?.message || 'Please try again in a moment'}
            </p>
          </div>
        ) : !data?.items?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <ScrollText className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">No audit events found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border-strong text-text-muted text-left">
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Resource</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">User / IP</th>
                  <th className="px-4 py-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((log) => {
                  const details = tryParseDetails(log.details);
                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border-strong/50 hover:bg-dark-elevated/50 transition-colors"
                    >
                      {/* Action */}
                      <td className="px-4 py-3">
                        <Badge variant={actionVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>

                      {/* Resource type + short ID */}
                      <td className="px-4 py-3 text-text-secondary">
                        <span className="font-mono text-xs">
                          {log.resourceType}
                        </span>
                        {log.shortUrlId && (
                          <span className="block text-[10px] text-text-muted font-mono mt-0.5 truncate max-w-[120px]">
                            {log.shortUrlId}
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3 max-w-[260px]">
                        {details ? (
                          <div className="space-y-0.5">
                            {Object.entries(details).map(([k, v]) => (
                              <div
                                key={k}
                                className="text-xs text-text-muted truncate"
                              >
                                <span className="text-text-secondary font-medium">
                                  {k}:
                                </span>{' '}
                                {String(v)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>

                      {/* User / IP / UA */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-text-secondary">
                          <User className="w-3 h-3 text-text-muted" />
                          <span className="font-mono truncate max-w-[100px]">
                            {log.userId?.substring(0, 8)}…
                          </span>
                        </div>
                        {log.ipAddress && (
                          <div className="flex items-center gap-1 text-[10px] text-text-muted mt-0.5">
                            <Globe className="w-2.5 h-2.5" />
                            {log.ipAddress}
                          </div>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 text-xs text-text-secondary">
                          <Clock className="w-3 h-3 text-text-muted" />
                          {dayjs(log.createdAt).fromNow()}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {dayjs(log.createdAt).format('MMM D, YYYY HH:mm:ss')}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t-2 border-border-strong">
            <span className="text-xs text-text-muted">
              Page {data.page + 1} of {data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={data.page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-2 border-border-strong text-text-secondary hover:bg-dark-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                disabled={data.page + 1 >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-2 border-border-strong text-text-secondary hover:bg-dark-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

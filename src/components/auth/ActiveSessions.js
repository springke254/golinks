import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Monitor, Smartphone, Globe, Shield, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

import * as userService from '../../services/userService';
import Spinner from '../ui/Spinner';

function parseUserAgent(ua) {
  if (!ua) return { icon: Globe, label: 'Unknown device' };
  const lower = ua.toLowerCase();
  if (lower.includes('mobile') || lower.includes('android') || lower.includes('iphone')) {
    return { icon: Smartphone, label: 'Mobile' };
  }
  return { icon: Monitor, label: 'Desktop' };
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ActiveSessions() {
  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: userService.getSessions,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-danger text-sm">
        <AlertTriangle className="w-4 h-4" />
        Failed to load sessions
      </div>
    );
  }

  const sessionList = sessions || [];
  const activeSession = sessionList.find((session) => session.current) || sessionList[0] || null;
  const deviceMeta = activeSession ? parseUserAgent(activeSession.userAgent) : null;
  const DeviceIcon = deviceMeta?.icon;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Shield className="w-5 h-5" />
        <p className="text-sm">
          Showing your active session only.
        </p>
      </div>

      {!activeSession ? (
        <p className="text-center text-sm text-text-muted py-8">No active session found.</p>
      ) : (
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between p-4 bg-dark-elevated border-2 border-border-strong"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-dark-card border-2 border-border-strong flex items-center justify-center">
              {DeviceIcon && <DeviceIcon className="w-5 h-5 text-text-secondary" />}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">
                {deviceMeta?.label || 'Unknown device'}
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary text-text-inverse">
                  Active
                </span>
              </p>
              <p className="text-xs text-text-muted">
                {activeSession.ipAddress || 'Unknown IP'}
              </p>
              <div className="flex items-center gap-1 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                Active from {formatDate(activeSession.createdAt)} to {formatDate(activeSession.lastUsedAt)}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

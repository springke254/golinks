import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Monitor, Smartphone, Globe, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import * as userService from '../../services/userService';
import Button from '../ui/Button';
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
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, isError } = useQuery({
    queryKey: ['sessions'],
    queryFn: userService.getSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId) => userService.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Session revoked');
    },
    onError: () => {
      toast.error('Failed to revoke session');
    },
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

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center gap-2 text-text-secondary">
        <Shield className="w-5 h-5" />
        <p className="text-sm">
          These are the devices currently logged in to your account. Revoke any session you don't
          recognize.
        </p>
      </div>

      {sessionList.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-8">No active sessions found.</p>
      ) : (
        <AnimatePresence mode="popLayout">
          {sessionList.map((session) => {
            const { icon: DeviceIcon, label: deviceLabel } = parseUserAgent(session.userAgent);
            return (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-between p-4 bg-dark-elevated border-2 border-border-strong"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-dark-card border-2 border-border-strong flex items-center justify-center">
                    <DeviceIcon className="w-5 h-5 text-text-secondary" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {deviceLabel}
                      {session.current && (
                        <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary text-text-inverse">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-muted">
                      {session.ipAddress || 'Unknown IP'} · Created {formatDate(session.createdAt)}
                    </p>
                    {session.expiresAt && (
                      <p className="text-xs text-text-muted">
                        Expires {formatDate(session.expiresAt)}
                      </p>
                    )}
                  </div>
                </div>

                {!session.current && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => revokeMutation.mutate(session.id)}
                    loading={revokeMutation.isPending && revokeMutation.variables === session.id}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}

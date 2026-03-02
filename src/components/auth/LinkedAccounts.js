import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link2Off, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import * as oauthService from '../../services/oauthService';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

const PROVIDER_META = {
  google: {
    name: 'Google',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  github: {
    name: 'GitHub',
    color: '#f5f5f5',
    icon: (
      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-text-primary">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
};

export default function LinkedAccounts() {
  const queryClient = useQueryClient();

  const { data: accounts, isLoading, isError } = useQuery({
    queryKey: ['linked-accounts'],
    queryFn: oauthService.getLinkedAccounts,
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider) => oauthService.unlinkProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-accounts'] });
      toast.success('Account unlinked');
    },
    onError: (err) => {
      const message = err.response?.data?.message || 'Failed to unlink account';
      toast.error(message);
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
        Failed to load linked accounts
      </div>
    );
  }

  const accountList = accounts || [];
  const linkedProviders = accountList.map((a) => a.provider);

  return (
    <div className="w-full space-y-4">
      <p className="text-sm text-text-secondary">
        Connect third-party accounts for quick sign in. You must keep at least one sign-in method
        active.
      </p>

      <div className="space-y-3">
        {Object.entries(PROVIDER_META).map(([provider, meta]) => {
          const linked = accountList.find((a) => a.provider === provider);
          return (
            <motion.div
              key={provider}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between p-4 bg-dark-elevated border-2 border-border-strong"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-dark-card border-2 border-border-strong flex items-center justify-center">
                  {meta.icon}
                </div>

                <div>
                  <p className="text-sm font-semibold text-text-primary">{meta.name}</p>
                  {linked ? (
                    <p className="text-xs text-text-muted">{linked.providerEmail || 'Connected'}</p>
                  ) : (
                    <p className="text-xs text-text-muted">Not connected</p>
                  )}
                </div>
              </div>

              {linked ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => unlinkMutation.mutate(provider)}
                  loading={unlinkMutation.isPending && unlinkMutation.variables === provider}
                >
                  <Link2Off className="w-4 h-4 mr-1" />
                  Unlink
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // OAuth linking redirects to backend which handles the flow
                    window.location.href = `/api/v1/auth/oauth/${provider}`;
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Connect
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {linkedProviders.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-xs text-text-muted py-2"
          >
            No accounts linked yet. Connect a provider for faster sign-in.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

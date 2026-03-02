import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X, MailIcon } from 'lucide-react';
import { useRateLimit } from '../../hooks/useRateLimit';

/**
 * Dismissible banner that slides down from the top when a rate-limit
 * is active. Shows the server's message, a live countdown timer,
 * and a link to contact support.
 *
 * Uses the same dark Spotify-inspired theme as the rest of the app.
 */
export default function RateLimitBanner() {
  const { isLimited, retryAfter, message, resetLimit } = useRateLimit();

  return (
    <AnimatePresence>
      {isLimited && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full bg-dark-elevated border-b-2 border-warning px-4 py-3"
          role="alert"
        >
          <div className="max-w-6xl mx-auto flex items-start sm:items-center gap-3">
            {/* Warning icon */}
            <div className="flex-shrink-0 bg-warning/10 p-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {message}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                {/* Countdown */}
                <span className="inline-flex items-center gap-1.5 text-xs text-warning font-bold tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  Retry in {retryAfter}s
                </span>

                {/* Support link */}
                <a
                  href="mailto:support@golinks.local"
                  className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                >
                  <MailIcon className="w-3 h-3" />
                  Contact support
                </a>
              </div>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={resetLimit}
              className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Dismiss rate limit banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

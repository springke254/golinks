import { useState, useEffect, useCallback, useRef } from 'react';
import { RATE_LIMIT_EVENT } from '../services/api';

/**
 * Global rate-limit state hook.
 *
 * Listens for RATE_LIMIT_EVENT dispatched by the axios interceptor
 * and manages a countdown timer. Components can use this to display
 * a banner or disable actions while rate-limited.
 *
 * @returns {{ isLimited: boolean, retryAfter: number, message: string, resetLimit: () => void }}
 */
export function useRateLimit() {
  const [isLimited, setIsLimited] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [message, setMessage] = useState('');
  const intervalRef = useRef(null);

  const resetLimit = useCallback(() => {
    setIsLimited(false);
    setRetryAfter(0);
    setMessage('');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const { retryAfter: seconds, message: msg } = e.detail;
      setIsLimited(true);
      setRetryAfter(seconds);
      setMessage(msg || 'Too many requests — please slow down and try again shortly');

      // Clear any existing countdown
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Start countdown
      let remaining = seconds;
      intervalRef.current = setInterval(() => {
        remaining -= 1;
        setRetryAfter(remaining);
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsLimited(false);
          setRetryAfter(0);
          setMessage('');
        }
      }, 1000);
    };

    window.addEventListener(RATE_LIMIT_EVENT, handler);
    return () => {
      window.removeEventListener(RATE_LIMIT_EVENT, handler);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { isLimited, retryAfter, message, resetLimit };
}

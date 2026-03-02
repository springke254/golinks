import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as authService from '../services/authService';
import { getAccessToken } from '../services/api';
import { jwtDecode } from 'jwt-decode';

/**
 * Silently refreshes the access token before it expires.
 * Uses TanStack Query's refetchInterval to keep the token fresh.
 */
export function useTokenRefresh() {
  const { data } = useQuery({
    queryKey: ['tokenRefresh'],
    queryFn: async () => {
      const token = getAccessToken();
      if (!token) return null;

      try {
        const decoded = jwtDecode(token);
        const expiresAt = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;

        // Refresh when 80% of lifetime has passed
        if (timeUntilExpiry < (decoded.exp - decoded.iat) * 1000 * 0.2) {
          const result = await authService.refresh();
          return result;
        }

        return { accessToken: token };
      } catch {
        return null;
      }
    },
    refetchInterval: 60000, // Check every minute
    refetchIntervalInBackground: false,
    retry: false,
    staleTime: 30000,
  });

  return data;
}

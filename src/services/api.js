import axios from 'axios';

let accessToken = null;
let refreshPromise = null;

// Custom event for rate-limit notifications
export const RATE_LIMIT_EVENT = 'golinks:rate-limit';

export function dispatchRateLimitEvent(retryAfter, message) {
  window.dispatchEvent(
    new CustomEvent(RATE_LIMIT_EVENT, {
      detail: { retryAfter, message },
    })
  );
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies (refresh token)
});

// Request interceptor — attach access token + workspace context
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // Attach active workspace ID from localStorage for workspace-scoped requests
    const wsId = localStorage.getItem('golinks_active_workspace_id');
    if (wsId) {
      config.headers['X-Workspace-Id'] = wsId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 429 rate-limit and 401 with silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // --- 429 Too Many Requests ---
    if (error.response?.status === 429) {
      const retryAfter =
        parseInt(error.response.headers['retry-after'], 10) ||
        error.response.data?.retryAfter ||
        60;
      const message =
        error.response.data?.message ||
        'Too many requests — please slow down and try again shortly';

      // Notify the UI via custom event
      dispatchRateLimitEvent(retryAfter, message);

      return Promise.reject(error);
    }

    // --- 401 Unauthorized (or 403 from expired/missing token) with silent refresh ---
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/signup') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/analytics/telemetry')
    ) {
      originalRequest._retry = true;

      try {
        // Deduplicate concurrent refresh requests
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }

        const response = await refreshPromise;
        const newToken = response.data.accessToken;
        setAccessToken(newToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed — clear auth and redirect to login
        setAccessToken(null);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export default api;

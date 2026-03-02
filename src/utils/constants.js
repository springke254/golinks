// Route paths
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/',
  LINKS: '/links',
  ANALYTICS: '/analytics',
  AUDIT: '/audit',
  SETTINGS: '/settings',
};

// API endpoints
export const API = {
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    LOGOUT_ALL: '/auth/logout-all',
    VERIFY_EMAIL: '/auth/verify-email',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },
  OAUTH: {
    ACCOUNTS: '/auth/oauth/accounts',
    LINK: '/auth/oauth/link',
    UNLINK: (provider) => `/auth/oauth/unlink/${provider}`,
  },
  USERS: {
    ME: '/users/me',
    UPDATE_ME: '/users/me',
    SESSIONS: '/users/me/sessions',
    REVOKE_SESSION: (sessionId) => `/users/me/sessions/${sessionId}`,
    LINKED_ACCOUNTS: '/users/me/linked-accounts',
  },
  LINKS: {
    LIST: '/links',
    CREATE: '/links',
    GET: (id) => `/links/${id}`,
    UPDATE: (id) => `/links/${id}`,
    DELETE: (id) => `/links/${id}`,
    BULK_DELETE: '/links/bulk-delete',
    STATS: '/links/stats',
    CHECK_SLUG: (slug) => `/links/check-slug/${slug}`,
    TAGS: '/links/tags',
    BULK_IMPORT: '/links/bulk-import',
    BULK_OPERATION: (id) => `/links/bulk-operations/${id}`,
  },
  ANALYTICS: {
    SUMMARY: '/analytics/summary',
    TIMESERIES: '/analytics/timeseries',
    REFERRERS: '/analytics/referrers',
    TOP_LINKS: '/analytics/top-links',
  },
  AUDIT: {
    LIST: '/audit',
    ACTIONS: '/audit/actions',
  },
};

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

// Auth image — team collaboration
export const AUTH_IMAGE_URL = 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80&auto=format&fit=crop';

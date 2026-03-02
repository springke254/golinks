// Route paths
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  ONBOARDING: '/onboarding',
  INVITE: '/invite',
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
  WORKSPACES: {
    LIST: '/workspaces',
    CREATE: '/workspaces',
    GET: (id) => `/workspaces/${id}`,
    UPDATE: (id) => `/workspaces/${id}`,
    DELETE: (id) => `/workspaces/${id}`,
    ME: (id) => `/workspaces/${id}/me`,
    CHECK_SLUG: (slug) => `/workspaces/check-slug/${slug}`,
    MEMBERS: (id) => `/workspaces/${id}/members`,
    MEMBER: (id, userId) => `/workspaces/${id}/members/${userId}`,
    LEAVE: (id) => `/workspaces/${id}/members/me`,
    INVITES: (id) => `/workspaces/${id}/invites`,
    INVITE: (id, inviteId) => `/workspaces/${id}/invites/${inviteId}`,
    RESEND_INVITE: (id, inviteId) => `/workspaces/${id}/invites/${inviteId}/resend`,
  },
  INVITES: {
    VALIDATE: '/invites/validate',
    ACCEPT: '/invites/accept',
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
export const AUTH_IMAGE_URL = process.env.REACT_APP_AUTH_IMAGE_URL || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80&auto=format&fit=crop';

// Page-specific images
export const AUTH_IMAGES = {
  login: AUTH_IMAGE_URL,
  signup: process.env.REACT_APP_SIGNUP_IMAGE_URL || 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=1920&q=80&auto=format&fit=crop',
  onboarding: process.env.REACT_APP_ONBOARDING_IMAGE_URL || 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80&auto=format&fit=crop',
  invite: process.env.REACT_APP_INVITE_IMAGE_URL || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1920&q=80&auto=format&fit=crop',
};

// Workspace roles
export const WORKSPACE_ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
};

// Role permissions mapping
export const ROLE_PERMISSIONS = {
  OWNER: ['MANAGE_WORKSPACE', 'MANAGE_MEMBERS', 'MANAGE_INVITES', 'MANAGE_LINKS', 'VIEW_ANALYTICS', 'VIEW_AUDIT'],
  ADMIN: ['MANAGE_MEMBERS', 'MANAGE_INVITES', 'MANAGE_LINKS', 'VIEW_ANALYTICS', 'VIEW_AUDIT'],
  MEMBER: ['MANAGE_LINKS', 'VIEW_ANALYTICS'],
};

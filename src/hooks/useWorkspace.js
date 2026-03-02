import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getUserWorkspaces, validateMembership } from '../services/workspaceService';
import { useAuth } from './useAuth';
import { ROLE_PERMISSIONS } from '../utils/constants';

const WorkspaceContext = createContext(null);
const ACTIVE_WS_KEY = 'golinks_active_workspace_id';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

/** Small helper — wait for `ms` before resolving */
function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function WorkspaceProvider({ children }) {
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [loadError, setLoadError] = useState(null);   // NEW: tracks load failures
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const retryCountRef = useRef(0);

  // Load workspaces with automatic retry on failure
  const loadWorkspaces = useCallback(async (retries = MAX_RETRIES) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const data = await getUserWorkspaces();
        setWorkspaces(data);
        setLoadError(null);
        return data;
      } catch (err) {
        const is429 = err?.response?.status === 429;
        const isLast = attempt === retries;

        if (isLast) {
          // All retries exhausted — propagate the error
          setWorkspaces([]);
          setLoadError(err);
          return null; // null = error, [] = genuinely empty
        }

        // Wait before retrying (longer for rate-limit)
        const delay = is429
          ? (parseInt(err.response?.headers?.['retry-after'], 10) || 5) * 1000
          : RETRY_DELAY_MS * (attempt + 1);
        await wait(delay);
      }
    }
    return null;
  }, []);

  // Helper: activate a workspace from list data + optional membership details
  const activateWorkspace = useCallback((ws, membership) => {
    const role = membership?.role || ws.role || 'MEMBER';
    const permissions = membership?.permissions || ROLE_PERMISSIONS[role] || [];
    setActiveWorkspace({ ...ws, role, permissions });
    localStorage.setItem(ACTIVE_WS_KEY, ws.id);
    setHasWorkspace(true);
  }, []);

  // Validate and set active workspace
  const validateAndSetActive = useCallback(async (workspaceId) => {
    try {
      const membership = await validateMembership(workspaceId);
      const ws = workspaces.find((w) => w.id === workspaceId) || {
        id: workspaceId,
        slug: membership.slug,
        name: membership.slug,
      };
      activateWorkspace(ws, membership);
      return true;
    } catch {
      localStorage.removeItem(ACTIVE_WS_KEY);
      setActiveWorkspace(null);
      setHasWorkspace(false);
      return false;
    }
  }, [workspaces, activateWorkspace]);

  // Initialize after auth is ready
  useEffect(() => {
    // Wait for auth to finish loading before fetching workspaces
    if (authLoading) return;

    // Not authenticated — skip workspace loading
    if (!isAuthenticated) {
      setWorkspaces([]);
      setHasWorkspace(false);
      setActiveWorkspace(null);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      setIsLoading(true);
      setLoadError(null);
      retryCountRef.current = 0;

      try {
        const wsList = await loadWorkspaces();
        if (cancelled) return;

        // null means all retries failed — keep loadError set by loadWorkspaces
        if (wsList === null) {
          setHasWorkspace(false);
          setIsLoading(false);
          return;
        }

        if (wsList.length === 0) {
          setHasWorkspace(false);
          setIsLoading(false);
          return;
        }

        const storedId = localStorage.getItem(ACTIVE_WS_KEY);
        const targetWs = (storedId && wsList.find((w) => w.id === storedId)) || wsList[0];

        // Try to validate membership for full permissions
        try {
          const membership = await validateMembership(targetWs.id);
          if (cancelled) return;
          activateWorkspace(targetWs, membership);
        } catch {
          if (cancelled) return;
          // validateMembership failed — fall back to workspace list data
          // The workspace list already includes role from the backend
          activateWorkspace(targetWs, null);
        }
      } catch {
        if (cancelled) return;
        setHasWorkspace(false);
        setLoadError(new Error('Failed to initialize workspace'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch workspace
  const switchWorkspace = useCallback(async (workspaceId) => {
    try {
      const ws = workspaces.find((w) => w.id === workspaceId) || { id: workspaceId };
      try {
        const membership = await validateMembership(workspaceId);
        activateWorkspace({ ...ws, slug: membership.slug }, membership);
      } catch {
        // validateMembership failed — use workspace list data as fallback
        activateWorkspace(ws, null);
      }

      // Invalidate all workspace-scoped queries
      queryClient.cancelQueries();
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['linkStats'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });

      return true;
    } catch {
      return false;
    }
  }, [workspaces, queryClient, activateWorkspace]);

  // Check permission
  const hasPermission = useCallback((permission) => {
    if (!activeWorkspace?.role) return false;
    const perms = activeWorkspace.permissions || ROLE_PERMISSIONS[activeWorkspace.role] || [];
    return perms.includes(permission);
  }, [activeWorkspace]);

  // Manual retry — re-runs the full init flow
  const retryInit = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const wsList = await loadWorkspaces();
      if (wsList === null) {
        setHasWorkspace(false);
        setIsLoading(false);
        return;
      }
      if (wsList.length === 0) {
        setHasWorkspace(false);
        setIsLoading(false);
        return;
      }
      const storedId = localStorage.getItem(ACTIVE_WS_KEY);
      const targetWs = (storedId && wsList.find((w) => w.id === storedId)) || wsList[0];
      try {
        const membership = await validateMembership(targetWs.id);
        activateWorkspace(targetWs, membership);
      } catch {
        activateWorkspace(targetWs, null);
      }
    } catch {
      setHasWorkspace(false);
      setLoadError(new Error('Failed to initialize workspace'));
    } finally {
      setIsLoading(false);
    }
  }, [loadWorkspaces, activateWorkspace]);

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    const wsList = await loadWorkspaces(0); // no retries for manual refresh
    // If we had no workspace before and now we do, auto-select first
    if (wsList && !hasWorkspace && wsList.length > 0) {
      await switchWorkspace(wsList[0].id);
    }
    return wsList || [];
  }, [loadWorkspaces, hasWorkspace, switchWorkspace]);

  // After creating a new workspace — set state directly from response
  // to avoid stale-closure issues with switchWorkspace + workspaces
  const onWorkspaceCreated = useCallback(async (workspace) => {
    try {
      // Fetch fresh workspace list
      const wsList = await loadWorkspaces(1); // 1 retry for post-create
      if (wsList) setWorkspaces(wsList);

      // Find the workspace in the fresh list, fallback to the response data
      const ws = (wsList && wsList.find((w) => w.id === workspace.id)) || workspace;

      // Try to validate membership for full permissions
      try {
        const membership = await validateMembership(workspace.id);
        activateWorkspace(ws, membership);
      } catch {
        // Fall back to workspace response data (includes role)
        activateWorkspace(ws, null);
      }

      // Invalidate queries for the new workspace context
      queryClient.cancelQueries();
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    } catch {
      // Fallback — use the workspace response data directly
      activateWorkspace(workspace, null);
      setWorkspaces((prev) => [...prev, workspace]);
    }
  }, [loadWorkspaces, queryClient, activateWorkspace]);

  const value = useMemo(() => ({
    activeWorkspace,
    workspaces,
    isLoading,
    hasWorkspace,
    loadError,
    switchWorkspace,
    hasPermission,
    refreshWorkspaces,
    loadWorkspaces,
    onWorkspaceCreated,
    retryInit,
  }), [activeWorkspace, workspaces, isLoading, hasWorkspace, loadError, switchWorkspace, hasPermission, refreshWorkspaces, loadWorkspaces, onWorkspaceCreated, retryInit]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

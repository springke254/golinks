import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getUserWorkspaces, validateMembership } from '../services/workspaceService';
import { useAuth } from './useAuth';
import { ROLE_PERMISSIONS } from '../utils/constants';

const WorkspaceContext = createContext(null);
const ACTIVE_WS_KEY = 'golinks_active_workspace_id';

export function WorkspaceProvider({ children }) {
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Load workspaces on mount
  const loadWorkspaces = useCallback(async () => {
    try {
      const data = await getUserWorkspaces();
      setWorkspaces(data);
      return data;
    } catch {
      setWorkspaces([]);
      return [];
    }
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
      setActiveWorkspace({
        ...ws,
        role: membership.role,
        permissions: membership.permissions,
      });
      localStorage.setItem(ACTIVE_WS_KEY, workspaceId);
      setHasWorkspace(true);
      return true;
    } catch {
      localStorage.removeItem(ACTIVE_WS_KEY);
      setActiveWorkspace(null);
      setHasWorkspace(false);
      return false;
    }
  }, [workspaces]);

  // Initialize after auth is ready
  useEffect(() => {
    // Wait for auth to finish loading before fetching workspaces
    if (authLoading) return;

    // Not authenticated — skip workspace loading
    if (!isAuthenticated) {
      setWorkspaces([]);
      setHasWorkspace(false);
      setActiveWorkspace(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        const wsList = await loadWorkspaces();
        if (cancelled) return;

        if (wsList.length === 0) {
          setHasWorkspace(false);
          setIsLoading(false);
          return;
        }

        const storedId = localStorage.getItem(ACTIVE_WS_KEY);
        const targetId = storedId && wsList.find((w) => w.id === storedId)
          ? storedId
          : wsList[0].id;

        try {
          const membership = await validateMembership(targetId);
          if (cancelled) return;
          const ws = wsList.find((w) => w.id === targetId) || wsList[0];
          setActiveWorkspace({
            ...ws,
            role: membership.role,
            permissions: membership.permissions,
          });
          localStorage.setItem(ACTIVE_WS_KEY, targetId);
          setHasWorkspace(true);
        } catch {
          if (cancelled) return;
          // Stored workspace invalid, try first workspace
          if (wsList.length > 0 && targetId !== wsList[0].id) {
            try {
              const membership = await validateMembership(wsList[0].id);
              if (cancelled) return;
              setActiveWorkspace({
                ...wsList[0],
                role: membership.role,
                permissions: membership.permissions,
              });
              localStorage.setItem(ACTIVE_WS_KEY, wsList[0].id);
              setHasWorkspace(true);
            } catch {
              if (cancelled) return;
              setHasWorkspace(false);
            }
          } else {
            setHasWorkspace(false);
          }
        }
      } catch {
        if (cancelled) return;
        setHasWorkspace(false);
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
      const membership = await validateMembership(workspaceId);
      const ws = workspaces.find((w) => w.id === workspaceId);
      const newActive = {
        ...(ws || { id: workspaceId, slug: membership.slug }),
        role: membership.role,
        permissions: membership.permissions,
      };
      setActiveWorkspace(newActive);
      localStorage.setItem(ACTIVE_WS_KEY, workspaceId);
      setHasWorkspace(true);

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
  }, [workspaces, queryClient]);

  // Check permission
  const hasPermission = useCallback((permission) => {
    if (!activeWorkspace?.role) return false;
    const perms = activeWorkspace.permissions || ROLE_PERMISSIONS[activeWorkspace.role] || [];
    return perms.includes(permission);
  }, [activeWorkspace]);

  // Refresh workspaces list
  const refreshWorkspaces = useCallback(async () => {
    const wsList = await loadWorkspaces();
    // If we had no workspace before and now we do, auto-select first
    if (!hasWorkspace && wsList.length > 0) {
      await switchWorkspace(wsList[0].id);
    }
    return wsList;
  }, [loadWorkspaces, hasWorkspace, switchWorkspace]);

  // After creating a new workspace
  const onWorkspaceCreated = useCallback(async (workspace) => {
    const wsList = await loadWorkspaces();
    setWorkspaces(wsList);
    await switchWorkspace(workspace.id);
  }, [loadWorkspaces, switchWorkspace]);

  const value = useMemo(() => ({
    activeWorkspace,
    workspaces,
    isLoading,
    hasWorkspace,
    switchWorkspace,
    hasPermission,
    refreshWorkspaces,
    loadWorkspaces,
    onWorkspaceCreated,
  }), [activeWorkspace, workspaces, isLoading, hasWorkspace, switchWorkspace, hasPermission, refreshWorkspaces, loadWorkspaces, onWorkspaceCreated]);

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

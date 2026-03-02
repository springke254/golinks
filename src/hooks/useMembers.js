import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from './useWorkspace';
import * as workspaceService from '../services/workspaceService';
import toast from 'react-hot-toast';

export function useMembers(params = {}) {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useQuery({
    queryKey: ['members', workspaceId, params],
    queryFn: () => workspaceService.getMembers(workspaceId, params),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: ({ userId, role }) =>
      workspaceService.updateMemberRole(activeWorkspace.id, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member role updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update member role');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (userId) =>
      workspaceService.removeMember(activeWorkspace.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member removed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    },
  });
}

export function useLeaveWorkspace() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: () => workspaceService.leaveWorkspace(activeWorkspace.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('You left the workspace');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to leave workspace');
    },
  });
}

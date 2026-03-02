import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkspace } from './useWorkspace';
import * as workspaceService from '../services/workspaceService';
import toast from 'react-hot-toast';

export function useInvites(params = {}) {
  const { activeWorkspace, hasPermission } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  return useQuery({
    queryKey: ['invites', workspaceId, params],
    queryFn: () => workspaceService.getInvites(workspaceId, params),
    enabled: !!workspaceId && hasPermission('MANAGE_INVITES'),
    staleTime: 30_000,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (data) =>
      workspaceService.createInvite(activeWorkspace.id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success(`Invite sent to ${data.email}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (inviteId) =>
      workspaceService.revokeInvite(activeWorkspace.id, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Invite revoked');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to revoke invite');
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  const { activeWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: (inviteId) =>
      workspaceService.resendInvite(activeWorkspace.id, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Invite resent');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to resend invite');
    },
  });
}

export function useValidateInviteToken(token) {
  return useQuery({
    queryKey: ['inviteValidation', token],
    queryFn: () => workspaceService.validateInviteToken(token),
    enabled: !!token,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token) => workspaceService.acceptInvite(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Invite accepted! Welcome to the workspace.');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to accept invite');
    },
  });
}

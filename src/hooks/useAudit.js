import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, getAuditActions } from '../services/auditService';

// Helper: read active workspace ID for scoped query keys
function getWsId() {
  return localStorage.getItem('golinks_active_workspace_id') || null;
}

export function useAuditLogs(params = {}) {
  const wsId = getWsId();
  return useQuery({
    queryKey: ['auditLogs', wsId, params],
    queryFn: () => getAuditLogs(params),
    keepPreviousData: true,
    enabled: !!wsId,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: ['auditActions'],
    queryFn: getAuditActions,
    staleTime: 60_000,
  });
}

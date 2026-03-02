import { useQuery } from '@tanstack/react-query';
import { getAuditLogs, getAuditActions } from '../services/auditService';

export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: ['auditLogs', params],
    queryFn: () => getAuditLogs(params),
    keepPreviousData: true,
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: ['auditActions'],
    queryFn: getAuditActions,
    staleTime: 60_000,
  });
}

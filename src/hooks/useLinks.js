import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as linkService from '../services/linkService';

export function useLinks(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['links', filters],
    queryFn: ({ pageParam }) =>
      linkService.getLinks({
        ...filters,
        cursor: pageParam || undefined,
        limit: 20,
      }),
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
    initialPageParam: null,
  });
}

export function useLinkStats() {
  return useQuery({
    queryKey: ['link-stats'],
    queryFn: linkService.getLinkStats,
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => linkService.createLink(data),
    onMutate: async (newLink) => {
      await queryClient.cancelQueries({ queryKey: ['links'] });
      const previousLinks = queryClient.getQueryData(['links']);

      // Optimistic: add a temporary _creating item
      queryClient.setQueriesData({ queryKey: ['links'] }, (old) => {
        if (!old?.pages) return old;
        const tempLink = {
          id: `temp-${Date.now()}`,
          slug: newLink.slug || '...',
          destinationUrl: newLink.destinationUrl,
          title: newLink.title || '',
          tags: (newLink.tags || []).map((t) => ({ id: t, name: t })),
          clicksCount: 0,
          isActive: true,
          isPasswordProtected: !!newLink.password,
          isPrivate: newLink.isPrivate || false,
          isOneTime: newLink.isOneTime || false,
          expiresAt: newLink.expiresAt || null,
          maxClicks: newLink.maxClicks || null,
          createdAt: new Date().toISOString(),
          _creating: true,
        };
        return {
          ...old,
          pages: old.pages.map((page, i) =>
            i === 0 ? { ...page, items: [tempLink, ...page.items] } : page
          ),
        };
      });

      return { previousLinks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLinks) {
        queryClient.setQueriesData({ queryKey: ['links'] }, context.previousLinks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    },
  });
}

export function useUpdateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => linkService.updateLink(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['links'] });
      const previousLinks = queryClient.getQueryData(['links']);

      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['links'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === id ? { ...item, ...data } : item
            ),
          })),
        };
      });

      return { previousLinks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLinks) {
        queryClient.setQueriesData({ queryKey: ['links'] }, context.previousLinks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => linkService.deleteLink(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['links'] });
      const previousLinks = queryClient.getQueryData(['links']);

      // Optimistic: mark as _deleting
      queryClient.setQueriesData({ queryKey: ['links'] }, (old) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === id ? { ...item, _deleting: true } : item
            ),
          })),
        };
      });

      return { previousLinks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLinks) {
        queryClient.setQueriesData({ queryKey: ['links'] }, context.previousLinks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    },
  });
}

export function useBulkDeleteLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids) => linkService.bulkDeleteLinks(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    },
  });
}

export function useCheckSlug(slug) {
  return useQuery({
    queryKey: ['check-slug', slug],
    queryFn: () => linkService.checkSlugAvailability(slug),
    enabled: !!slug && slug.length >= 3,
    staleTime: 5000,
    retry: false,
  });
}

export function useUserTags() {
  return useQuery({
    queryKey: ['user-tags'],
    queryFn: linkService.getUserTags,
    staleTime: 30000,
  });
}

export function useBulkImport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => linkService.bulkImportLinks(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      queryClient.invalidateQueries({ queryKey: ['link-stats'] });
    },
  });
}

export function useBulkOperationStatus(operationId) {
  return useQuery({
    queryKey: ['bulk-operation', operationId],
    queryFn: () => linkService.getBulkOperationStatus(operationId),
    enabled: !!operationId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') return false;
      return 2000; // Poll every 2s while in progress
    },
  });
}

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import LinkRow from './LinkRow';
import LinkCard from './LinkCard';
import LinkFilters from './LinkFilters';
import BulkActions from './BulkActions';
import EditLinkModal from './EditLinkModal';
import QRCodeModal from './QRCodeModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import Skeleton from '../ui/Skeleton';
import { useLinksPage, useUpdateLink, useDeleteLink, useBulkDeleteLinks } from '../../hooks/useLinks';

const PAGE_SIZE = 20;

export default function LinkList() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [editLink, setEditLink] = useState(null);
  const [qrLink, setQrLink] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // link or 'bulk'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useLinksPage(filters, page, PAGE_SIZE);

  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const bulkDelete = useBulkDeleteLinks();

  const allLinks = useMemo(() => data?.items ?? [], [data]);
  const totalPages = data?.totalPages ?? 0;
  const currentPage = data?.page ?? page;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback(
    (nextPage) => {
      if (nextPage < 0 || nextPage >= totalPages || nextPage === currentPage) return;
      setPage(nextPage);
      setSelected(new Set());
    },
    [currentPage, totalPages]
  );

  const handleFiltersChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
    setPage(0);
    setSelected(new Set());
  }, []);

  const handleSelect = useCallback((id, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      if (checked) {
        setSelected(new Set(allLinks.map((l) => l.id)));
      } else {
        setSelected(new Set());
      }
    },
    [allLinks]
  );

  const handleToggleActive = useCallback(
    (link) => {
      updateLink.mutate(
        { id: link.id, data: { isActive: link.isActive === false ? true : false } },
        {
          onSuccess: () => {
            toast.success(
              link.isActive === false ? 'Link activated' : 'Link deactivated'
            );
          },
          onError: () => toast.error('Failed to update link'),
        }
      );
    },
    [updateLink]
  );

  const handleDeleteClick = useCallback((link) => {
    setDeleteTarget(link);
    setShowDeleteConfirm(true);
  }, []);

  const handleBulkDeleteClick = useCallback(() => {
    setDeleteTarget('bulk');
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteTarget === 'bulk') {
      const ids = Array.from(selected);
      bulkDelete.mutate(ids, {
        onSuccess: (res) => {
          toast.success(`${res.deletedCount ?? ids.length} links deleted`);
          setSelected(new Set());
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        },
        onError: () => toast.error('Failed to delete links'),
      });
    } else if (deleteTarget) {
      deleteLink.mutate(deleteTarget.id, {
        onSuccess: () => {
          toast.success('Link deleted');
          setSelected((prev) => {
            const next = new Set(prev);
            next.delete(deleteTarget.id);
            return next;
          });
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        },
        onError: () => toast.error('Failed to delete link'),
      });
    }
  }, [deleteTarget, selected, bulkDelete, deleteLink]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="w-10 h-10 text-danger" />
        <p className="text-text-muted text-sm">
          {error?.response?.data?.message || 'Failed to load links'}
        </p>
      </div>
    );
  }

  const allSelected = allLinks.length > 0 && selected.size === allLinks.length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <LinkFilters filters={filters} onChange={handleFiltersChange} />

      {/* Bulk Actions */}
      <BulkActions
        selectedCount={selected.size}
        onBulkDelete={handleBulkDeleteClick}
        onClearSelection={() => setSelected(new Set())}
      />

      {/* Empty state */}
      {allLinks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 gap-3"
        >
          <div className="w-14 h-14 flex items-center justify-center bg-dark-elevated border-2 border-border-strong">
            <Link2 className="w-7 h-7 text-text-muted" />
          </div>
          <p className="text-text-muted text-sm font-semibold">
            {filters.search ? 'No links found matching your search' : 'No links yet'}
          </p>
          {!filters.search && (
            <p className="text-text-muted text-xs">
              Create your first short link to get started
            </p>
          )}
        </motion.div>
      )}

      {/* Desktop table */}
      {allLinks.length > 0 && (
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border-strong">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 accent-primary cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
                  Link
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
                  Title
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-text-muted">
                  Clicks
                </th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <AnimatePresence>
              <tbody>
                {allLinks.map((link) => (
                  <LinkRow
                    key={link.id}
                    link={link}
                    selected={selected.has(link.id)}
                    onSelect={handleSelect}
                    onEdit={setEditLink}
                    onDelete={handleDeleteClick}
                    onQR={setQrLink}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </tbody>
            </AnimatePresence>
          </table>
        </div>
      )}

      {/* Mobile cards */}
      {allLinks.length > 0 && (
        <div className="lg:hidden space-y-3">
          {allLinks.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="text-xs text-text-muted font-semibold">Select all</span>
            </div>
          )}
          <AnimatePresence>
            {allLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                selected={selected.has(link.id)}
                onSelect={handleSelect}
                onEdit={setEditLink}
                onDelete={handleDeleteClick}
                onQR={setQrLink}
                onToggleActive={handleToggleActive}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <span className="text-xs text-text-muted">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              disabled={currentPage === 0}
              onClick={() => handlePageChange(currentPage - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-2 border-border-strong text-text-secondary hover:bg-dark-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((pageNumber) => {
                const isActive = pageNumber === currentPage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`min-w-8 h-8 px-2 text-xs font-bold border-2 transition-colors ${
                      isActive
                        ? 'bg-primary text-text-inverse border-primary'
                        : 'border-border-strong text-text-secondary hover:bg-dark-elevated'
                    }`}
                  >
                    {pageNumber + 1}
                  </button>
                );
              })}
            </div>

            <button
              disabled={currentPage + 1 >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border-2 border-border-strong text-text-secondary hover:bg-dark-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditLinkModal
        open={!!editLink}
        onClose={() => setEditLink(null)}
        link={editLink}
      />
      <QRCodeModal
        open={!!qrLink}
        onClose={() => setQrLink(null)}
        link={qrLink}
      />
      <DeleteConfirmModal
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        loading={deleteLink.isPending || bulkDelete.isPending}
        count={deleteTarget === 'bulk' ? selected.size : 1}
      />
    </div>
  );
}

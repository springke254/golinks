import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Link2, Loader2, Check, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { updateWorkspaceSchema, nameToSlug } from '../../schemas/workspaceSchemas';
import { useWorkspace } from '../../hooks/useWorkspace';
import { updateWorkspace, deleteWorkspace, checkWorkspaceSlug } from '../../services/workspaceService';
import { WORKSPACE_ROLES } from '../../utils/constants';
import Input from '../ui/Input';
import Button from '../ui/Button';

export default function WorkspaceSettings() {
  const { activeWorkspace, hasPermission, refreshWorkspaces } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  const isOwner = activeWorkspace?.role === WORKSPACE_ROLES.OWNER;
  const canManage = hasPermission('MANAGE_WORKSPACE');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: {
      name: activeWorkspace?.name || '',
      slug: activeWorkspace?.slug || '',
      description: activeWorkspace?.description || '',
    },
  });

  // Reset form when workspace changes
  useEffect(() => {
    if (activeWorkspace) {
      reset({
        name: activeWorkspace.name || '',
        slug: activeWorkspace.slug || '',
        description: activeWorkspace.description || '',
      });
    }
  }, [activeWorkspace, reset]);

  const slugValue = watch('slug');

  // Debounced slug check
  useEffect(() => {
    if (!slugValue || slugValue === activeWorkspace?.slug || slugValue.length < 2) {
      setSlugStatus(null);
      return;
    }

    setSlugStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await checkWorkspaceSlug(slugValue);
        setSlugStatus(result.available ? 'available' : 'taken');
      } catch {
        setSlugStatus(null);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slugValue, activeWorkspace?.slug]);

  const onSubmit = async (data) => {
    if (slugStatus === 'taken') return;
    setIsLoading(true);
    try {
      await updateWorkspace(activeWorkspace.id, data);
      await refreshWorkspaces();
      toast.success('Workspace updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update workspace');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== activeWorkspace?.slug) return;
    try {
      await deleteWorkspace(activeWorkspace.id);
      toast.success('Workspace deleted');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace');
    }
  };

  const slugIndicator = () => {
    if (!slugValue || slugValue === activeWorkspace?.slug || slugValue.length < 2) return null;
    if (slugStatus === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-text-muted" />;
    if (slugStatus === 'available') return <Check className="w-4 h-4 text-success" />;
    if (slugStatus === 'taken') return <X className="w-4 h-4 text-danger" />;
    return null;
  };

  if (!canManage) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary text-sm">Only workspace owners can manage workspace settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Update form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-md">
        <Input
          label="Workspace name"
          icon={Building2}
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Workspace URL
          </label>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Link2 className="w-5 h-5 text-text-muted" />
            </div>
            <input
              {...register('slug')}
              className={`w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong rounded-none px-4 py-2.5 text-sm pl-11 pr-10 focus:outline-none focus:border-primary transition-colors duration-150 ${
                errors.slug ? 'border-danger' : ''
              } ${slugStatus === 'taken' ? 'border-danger' : ''} ${slugStatus === 'available' ? 'border-success' : ''}`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {slugIndicator()}
            </div>
          </div>
          {errors.slug && <p className="mt-1 text-xs text-danger font-medium">{errors.slug.message}</p>}
          {slugStatus === 'taken' && !errors.slug && <p className="mt-1 text-xs text-danger font-medium">This slug is already taken</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Description <span className="text-text-muted font-normal">(optional)</span>
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors duration-150 resize-none"
          />
        </div>

        <Button
          type="submit"
          loading={isLoading}
          disabled={!isDirty || slugStatus === 'taken'}
        >
          Save changes
        </Button>
      </form>

      {/* Danger zone */}
      {isOwner && (
        <div className="border-2 border-danger/30 p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-danger">Danger zone</h3>
            <p className="text-xs text-text-muted mt-1">
              Deleting a workspace is permanent and cannot be undone. All links will be unassigned.
            </p>
          </div>

          {!deleteConfirm ? (
            <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4" />
              Delete workspace
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-text-secondary">
                Type <span className="font-bold text-text-primary">{activeWorkspace.slug}</span> to confirm deletion:
              </p>
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder={activeWorkspace.slug}
                className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-danger/50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-danger transition-colors"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setDeleteConfirm(false); setDeleteText(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deleteText !== activeWorkspace.slug}
                  onClick={handleDelete}
                >
                  Permanently delete
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

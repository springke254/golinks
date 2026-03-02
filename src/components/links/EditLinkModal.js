import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Globe,
  Link2,
  Type,
  Lock,
  EyeOff,
  Zap,
  Clock,
  Hash,
  ChevronDown,
  ChevronUp,
  ShieldOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';
import DateTimePicker from '../ui/DateTimePicker';
import Badge from '../ui/Badge';
import { updateLinkSchema } from '../../schemas/linkSchemas';
import { useUpdateLink, useUserTags } from '../../hooks/useLinks';

export default function EditLinkModal({ open, onClose, link }) {
  const updateLink = useUpdateLink();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: userTags } = useUserTags();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(updateLinkSchema),
    defaultValues: {
      destinationUrl: '',
      slug: '',
      title: '',
      tags: [],
      password: '',
      removePassword: false,
      isPrivate: false,
      isOneTime: false,
      expiresAt: '',
      maxClicks: '',
    },
  });

  const watchRemovePassword = watch('removePassword');

  useEffect(() => {
    if (link && open) {
      const expiresAt = link.expiresAt
        ? new Date(link.expiresAt).toISOString().slice(0, 16)
        : '';
      reset({
        destinationUrl: link.destinationUrl || '',
        slug: link.slug || '',
        title: link.title || '',
        tags: (link.tags || []).map((t) => (typeof t === 'string' ? t : t.name)),
        password: '',
        removePassword: false,
        isPrivate: link.isPrivate || false,
        isOneTime: link.isOneTime || false,
        expiresAt,
        maxClicks: link.maxClicks || '',
      });
      // Auto-show advanced options if the link has protections
      if (link.isPasswordProtected || link.isPrivate || link.isOneTime || link.expiresAt || link.maxClicks) {
        setShowAdvanced(true);
      } else {
        setShowAdvanced(false);
      }
    }
  }, [link, open, reset]);

  const onSubmit = (data) => {
    const payload = {};
    if (data.destinationUrl && data.destinationUrl !== link.destinationUrl) {
      payload.destinationUrl = data.destinationUrl;
    }
    if (data.slug && data.slug !== link.slug) {
      payload.slug = data.slug;
    }
    if (data.title !== undefined) {
      payload.title = data.title || null;
    }
    // Tags - always send
    payload.tags = data.tags || [];

    // Protection fields
    if (data.password) payload.password = data.password;
    if (data.removePassword) payload.removePassword = true;
    payload.isPrivate = data.isPrivate || false;
    payload.isOneTime = data.isOneTime || false;
    payload.expiresAt = data.expiresAt ? new Date(data.expiresAt).toISOString() : null;
    payload.maxClicks = data.maxClicks ? Number(data.maxClicks) : null;

    updateLink.mutate(
      { id: link.id, data: payload },
      {
        onSuccess: () => {
          toast.success('Link updated successfully');
          onClose();
        },
        onError: (err) => {
          const msg = err.response?.data?.message || 'Failed to update link';
          toast.error(msg);
        },
      }
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Link" maxWidth="lg">
      {/* Protection badges */}
      {link && (link.isPasswordProtected || link.isPrivate || link.isOneTime || link.expiresAt || link.maxClicks) && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {link.isPasswordProtected && (
            <Badge variant="warning">
              <Lock className="w-3 h-3 mr-1" />
              Password
            </Badge>
          )}
          {link.isPrivate && (
            <Badge variant="neutral">
              <EyeOff className="w-3 h-3 mr-1" />
              Private
            </Badge>
          )}
          {link.isOneTime && (
            <Badge variant="danger">
              <Zap className="w-3 h-3 mr-1" />
              One-Time
            </Badge>
          )}
          {link.expiresAt && (
            <Badge variant="warning">
              <Clock className="w-3 h-3 mr-1" />
              Expires
            </Badge>
          )}
          {link.maxClicks && (
            <Badge variant="neutral">
              <Hash className="w-3 h-3 mr-1" />
              Max: {link.maxClicks}
            </Badge>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Destination URL"
          icon={Globe}
          placeholder="https://example.com/very-long-url"
          error={errors.destinationUrl?.message}
          {...register('destinationUrl')}
        />

        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Custom Slug
          </label>
          <div className="flex items-center gap-0">
            <span className="flex items-center px-3 h-[42px] bg-dark-elevated border-2 border-r-0 border-border-strong text-text-muted text-sm font-medium select-none">
              go/
            </span>
            <div className="flex-1">
              <Input
                icon={Link2}
                placeholder="my-link"
                error={errors.slug?.message}
                containerClassName="[&_input]:border-l-0"
                {...register('slug')}
              />
            </div>
          </div>
        </div>

        <Input
          label="Title"
          icon={Type}
          placeholder="My awesome link"
          error={errors.title?.message}
          {...register('title')}
        />

        {/* Tags */}
        <Controller
          name="tags"
          control={control}
          render={({ field }) => (
            <TagInput
              label="Tags"
              value={field.value || []}
              onChange={field.onChange}
              suggestions={userTags || []}
              placeholder="Type and press Enter..."
              error={errors.tags?.message}
            />
          )}
        />

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-text-muted hover:text-text-secondary transition-colors w-full"
        >
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="font-semibold">Protection & Limits</span>
          <div className="flex-1 border-t border-border-strong" />
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-2 border-border-strong bg-dark-elevated/30 p-4">
                {/* Password */}
                <div className="space-y-2">
                  <Input
                    label={link?.isPasswordProtected ? 'Change Password' : 'Password Protection'}
                    icon={Lock}
                    type="password"
                    placeholder={link?.isPasswordProtected ? 'Enter new password...' : 'Leave empty for no password'}
                    error={errors.password?.message}
                    disabled={watchRemovePassword}
                    {...register('password')}
                  />
                  {link?.isPasswordProtected && (
                    <Controller
                      name="removePassword"
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer hover:text-text-secondary transition-colors">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="w-3.5 h-3.5 accent-danger cursor-pointer"
                          />
                          <ShieldOff className="w-3.5 h-3.5" />
                          Remove password protection
                        </label>
                      )}
                    />
                  )}
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="isPrivate"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-3 bg-dark-elevated border-2 border-border-strong p-3 cursor-pointer hover:border-primary/50 transition-colors">
                        <EyeOff className="w-4 h-4 text-text-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-text-secondary block">Private</span>
                          <span className="text-xs text-text-muted">Requires login</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    )}
                  />
                  <Controller
                    name="isOneTime"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-3 bg-dark-elevated border-2 border-border-strong p-3 cursor-pointer hover:border-primary/50 transition-colors">
                        <Zap className="w-4 h-4 text-text-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-text-secondary block">One-Time</span>
                          <span className="text-xs text-text-muted">Single use</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                      </label>
                    )}
                  />
                </div>

                {/* Expiry + Max Clicks */}
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="expiresAt"
                    control={control}
                    render={({ field }) => (
                      <DateTimePicker
                        label="Expires At"
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.expiresAt?.message}
                      />
                    )}
                  />
                  <div>
                    <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                      Max Clicks
                    </label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                      <input
                        type="number"
                        min="1"
                        placeholder="Unlimited"
                        {...register('maxClicks', { valueAsNumber: true })}
                        className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong rounded-none pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
                      />
                    </div>
                    {errors.maxClicks && (
                      <p className="mt-1 text-xs text-danger font-medium">{errors.maxClicks.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={updateLink.isPending} fullWidth>
            Save Changes
          </Button>
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

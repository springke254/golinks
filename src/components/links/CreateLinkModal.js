import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Globe,
  Link2,
  Type,
  ChevronDown,
  ChevronUp,
  Lock,
  EyeOff,
  Zap,
  Hash,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';
import DateTimePicker from '../ui/DateTimePicker';
import { createLinkSchema } from '../../schemas/linkSchemas';
import { useCreateLink, useCheckSlug, useUserTags } from '../../hooks/useLinks';

export default function CreateLinkModal({ open, onClose }) {
  const createLink = useCreateLink();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [slugInput, setSlugInput] = useState('');

  const { data: slugCheck, isLoading: slugChecking } = useCheckSlug(slugInput);
  const { data: userTags } = useUserTags();

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createLinkSchema),
    defaultValues: {
      destinationUrl: '',
      slug: '',
      title: '',
      tags: [],
      password: '',
      isPrivate: false,
      isOneTime: false,
      expiresAt: '',
      maxClicks: '',
    },
  });

  const watchedSlug = watch('slug');

  // Debounce slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (watchedSlug && watchedSlug.length >= 3) {
        setSlugInput(watchedSlug);
      } else {
        setSlugInput('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [watchedSlug]);

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      setValue('slug', suggestion, { shouldValidate: true });
    },
    [setValue]
  );

  const onSubmit = (data) => {
    const payload = {
      destinationUrl: data.destinationUrl,
      ...(data.slug && { slug: data.slug }),
      ...(data.title && { title: data.title }),
      ...(data.tags?.length > 0 && { tags: data.tags }),
      ...(data.password && { password: data.password }),
      ...(data.isPrivate && { isPrivate: true }),
      ...(data.isOneTime && { isOneTime: true }),
      ...(data.expiresAt && { expiresAt: new Date(data.expiresAt).toISOString() }),
      ...(data.maxClicks && { maxClicks: Number(data.maxClicks) }),
    };

    createLink.mutate(payload, {
      onSuccess: () => {
        toast.success('Link created successfully');
        reset();
        setShowAdvanced(false);
        setSlugInput('');
        onClose();
      },
      onError: (err) => {
        const msg = err.response?.data?.message || 'Failed to create link';
        toast.error(msg);
      },
    });
  };

  const handleClose = () => {
    reset();
    setShowAdvanced(false);
    setSlugInput('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create New Link" maxWidth="xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Destination URL"
          icon={Globe}
          placeholder="https://example.com/very-long-url"
          error={errors.destinationUrl?.message}
          {...register('destinationUrl')}
        />

        {/* Custom Slug with availability check */}
        <div>
          <label className="block text-sm font-semibold text-text-secondary mb-1.5">
            Custom Slug (optional)
          </label>
          <div className="flex items-center gap-0">
            <span className="flex items-center px-3 h-[42px] bg-dark-elevated border-2 border-r-0 border-border-strong text-text-muted text-sm font-medium select-none">
              go/
            </span>
            <div className="flex-1 relative">
              <Input
                icon={Link2}
                placeholder="my-link"
                error={errors.slug?.message}
                containerClassName="[&_input]:border-l-0"
                {...register('slug')}
              />
              {/* Slug availability indicator */}
              {watchedSlug && watchedSlug.length >= 3 && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugChecking ? (
                    <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                  ) : slugCheck?.available ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <X className="w-4 h-4 text-danger" />
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Slug suggestions */}
          {slugCheck && !slugCheck.available && slugCheck.suggestions?.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-muted">Try:</span>
              {slugCheck.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestionClick(s)}
                  className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Title (optional)"
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
              label="Tags (optional)"
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
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
          <span className="font-semibold">Advanced Options</span>
          <div className="flex-1 border-t border-border-strong" />
        </button>

        {/* Advanced Options Panel */}
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
                {/* Password Protection */}
                <Input
                  label="Password Protection"
                  icon={Lock}
                  type="password"
                  placeholder="Leave empty for no password"
                  error={errors.password?.message}
                  {...register('password')}
                />

                {/* Toggles Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Private Link */}
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

                  {/* One-Time Link */}
                  <Controller
                    name="isOneTime"
                    control={control}
                    render={({ field }) => (
                      <label className="flex items-center gap-3 bg-dark-elevated border-2 border-border-strong p-3 cursor-pointer hover:border-primary/50 transition-colors">
                        <Zap className="w-4 h-4 text-text-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-semibold text-text-secondary block">One-Time</span>
                          <span className="text-xs text-text-muted">Single use only</span>
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
          <Button type="submit" loading={createLink.isPending} fullWidth>
            Create Link
          </Button>
          <Button variant="secondary" onClick={handleClose} fullWidth>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

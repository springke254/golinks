import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Link2, Loader2, Check, X, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import { createWorkspaceSchema, nameToSlug } from '../../schemas/workspaceSchemas';
import { useWorkspace } from '../../hooks/useWorkspace';
import { createWorkspace, checkWorkspaceSlug } from '../../services/workspaceService';
import { ROUTES, AUTH_IMAGES } from '../../utils/constants';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';
import RateLimitBanner from '../../components/ui/RateLimitBanner';

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const { onWorkspaceCreated, hasWorkspace, isLoading: wsLoading, loadError, retryInit } = useWorkspace();
  const navigate = useNavigate();

  // Check for pending invite token in sessionStorage (from invite → signup flow)
  const pendingInviteToken = sessionStorage.getItem('golinks_pending_invite_token');

  // If user already has a workspace, redirect to dashboard
  useEffect(() => {
    if (!wsLoading && hasWorkspace) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [wsLoading, hasWorkspace, navigate]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  const nameValue = watch('name');
  const slugValue = watch('slug');

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue) {
      const generated = nameToSlug(nameValue);
      setValue('slug', generated, { shouldValidate: true });
    }
  }, [nameValue, setValue]);

  // Debounced slug availability check
  useEffect(() => {
    if (!slugValue || slugValue.length < 2) {
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
  }, [slugValue]);

  const onSubmit = async (data) => {
    if (slugStatus === 'taken') {
      setError('slug', { message: 'This slug is already taken' });
      return;
    }

    setIsLoading(true);
    try {
      const workspace = await createWorkspace(data);
      await onWorkspaceCreated(workspace);
      toast.success('Workspace created! Welcome aboard.');
      // Navigation is handled by the useEffect that watches hasWorkspace
      // This ensures the context has fully propagated before routing
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create workspace';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const slugIndicator = () => {
    if (!slugValue || slugValue.length < 2) return null;
    if (slugStatus === 'checking') {
      return <Loader2 className="w-4 h-4 animate-spin text-text-muted" />;
    }
    if (slugStatus === 'available') {
      return <Check className="w-4 h-4 text-success" />;
    }
    if (slugStatus === 'taken') {
      return <X className="w-4 h-4 text-danger" />;
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background-main">
      <RateLimitBanner />

      <div className="flex flex-1 overflow-hidden">
        {/* Left — Image panel */}
        <div className="hidden lg:block lg:w-1/2 relative">
          <img
            src={AUTH_IMAGES.onboarding}
            alt="Team workspace"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

          <div className="absolute inset-0 flex flex-col justify-between p-10">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Logo size="md" className="[&_span]:text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-3"
            >
              <h2 className="text-3xl font-bold text-white leading-tight">
                Create your workspace
              </h2>
              <p className="text-sm text-white/70 max-w-xs">
                Organize your links, collaborate with your team, and track performance — all in one place.
              </p>
              <p className="text-xs text-white/40 pt-4">
                &copy; {new Date().getFullYear()} Golinks
              </p>
            </motion.div>
          </div>
        </div>

        {/* Right — Onboarding form */}
        <div className="w-full lg:w-1/2 flex flex-col h-full overflow-y-auto">
          <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 xl:px-24 py-12">
            <div className="w-full max-w-sm">
            {/* Logo (mobile) */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10 lg:hidden"
            >
              <Logo size="xl" />
            </motion.div>

            {/* Pending invite banner */}
            {pendingInviteToken && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6 bg-primary/10 border-2 border-primary/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-text-primary">
                      You have a pending invite
                    </p>
                    <p className="text-xs text-text-secondary">
                      Accept the invite to join an existing workspace, or create a new one below.
                    </p>
                    <Link
                      to={`${ROUTES.INVITE}?token=${pendingInviteToken}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept invite
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error banner — shown when workspace loading failed */}
            {loadError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6 bg-warning/10 border-2 border-warning/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-text-primary">
                      We couldn't load your workspaces
                    </p>
                    <p className="text-xs text-text-secondary">
                      You may already have a workspace. A connection issue prevented us from checking.
                    </p>
                    <button
                      type="button"
                      onClick={retryInit}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry loading
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-text-primary">Set up your workspace</h1>
              <p className="mt-2 text-text-secondary text-sm">
                A workspace is where your team manages and shares links.
              </p>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-5">
                <Input
                  label="Workspace name"
                  icon={Building2}
                  placeholder="e.g. Acme Corp"
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
                      placeholder="acme-corp"
                      className={`w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong rounded-none px-4 py-2.5 text-sm pl-11 pr-10 focus:outline-none focus:border-primary transition-colors duration-150 ${
                        errors.slug ? 'border-danger focus:border-danger' : ''
                      } ${slugStatus === 'taken' ? 'border-danger focus:border-danger' : ''} ${
                        slugStatus === 'available' ? 'border-success focus:border-success' : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {slugIndicator()}
                    </div>
                  </div>
                  {errors.slug && (
                    <p className="mt-1 text-xs text-danger font-medium">{errors.slug.message}</p>
                  )}
                  {slugStatus === 'taken' && !errors.slug && (
                    <p className="mt-1 text-xs text-danger font-medium">This slug is already taken</p>
                  )}
                  {slugStatus === 'available' && (
                    <p className="mt-1 text-xs text-success font-medium">Slug is available!</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-secondary mb-1.5">
                    Description <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <textarea
                    {...register('description')}
                    placeholder="What does your team do?"
                    rows={3}
                    className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors duration-150 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={isLoading}
                  disabled={slugStatus === 'taken'}
                >
                  Create workspace
                </Button>
              </form>
            </motion.div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

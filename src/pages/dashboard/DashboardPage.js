import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link2, TrendingUp, Zap, Plus, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '../../hooks/useAuth';
import { useLinkStats, useCreateLink } from '../../hooks/useLinks';
import LinkList from '../../components/links/LinkList';
import CreateLinkModal from '../../components/links/CreateLinkModal';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { quickCreateSchema } from '../../schemas/linkSchemas';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useLinkStats();
  const [showCreate, setShowCreate] = useState(false);
  const createLink = useCreateLink();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quickCreateSchema),
    defaultValues: { destinationUrl: '' },
  });

  const onQuickCreate = (data) => {
    createLink.mutate(
      { destinationUrl: data.destinationUrl },
      {
        onSuccess: (result) => {
          toast.success(`go/${result.slug} created!`);
          reset();
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || 'Failed to create link');
        },
      }
    );
  };

  const statCards = [
    { label: 'Total Links', value: stats?.totalLinks ?? 0, icon: Link2 },
    { label: 'Total Clicks', value: stats?.totalClicks ?? 0, icon: TrendingUp },
    { label: 'Active Links', value: stats?.activeLinks ?? 0, icon: Zap },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Greeting + Create button */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ''}
          </h1>
          <p className="text-text-secondary mt-1">Here's an overview of your Golinks.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Create Link
        </Button>
      </motion.div>

      {/* Quick Create Bar */}
      <motion.div variants={item}>
        <form
          onSubmit={handleSubmit(onQuickCreate)}
          className="flex items-stretch gap-0"
        >
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Paste a URL to shorten it instantly..."
              {...register('destinationUrl')}
              className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-r-0 border-border-strong rounded-none pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={createLink.isPending}
            className="px-5 bg-primary text-text-inverse border-2 border-primary font-bold text-sm hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {createLink.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Shorten
          </button>
        </form>
        {errors.destinationUrl && (
          <p className="text-xs text-danger font-medium mt-1">{errors.destinationUrl.message}</p>
        )}
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-6 bg-dark-card border-2 border-border-strong space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-secondary">{stat.label}</span>
                <Icon className="w-5 h-5 text-text-muted" />
              </div>
              {statsLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-bold text-text-primary">
                  {stat.value.toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Recent links */}
      <motion.div variants={item} className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">Your Links</h2>
        <LinkList />
      </motion.div>

      {/* Create link modal */}
      <CreateLinkModal open={showCreate} onClose={() => setShowCreate(false)} />
    </motion.div>
  );
}

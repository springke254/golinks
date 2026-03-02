import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Upload, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import LinkList from '../../components/links/LinkList';
import CreateLinkModal from '../../components/links/CreateLinkModal';
import BulkImportModal from '../../components/links/BulkImportModal';
import Button from '../../components/ui/Button';
import { quickCreateSchema } from '../../schemas/linkSchemas';
import { useCreateLink } from '../../hooks/useLinks';

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

export default function LinksPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Links</h1>
          <p className="text-text-secondary mt-1">Manage all your shortened links.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowBulkImport(true)}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />
            Create Link
          </Button>
        </div>
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

      {/* Link list */}
      <motion.div variants={item}>
        <LinkList />
      </motion.div>

      {/* Modals */}
      <CreateLinkModal open={showCreate} onClose={() => setShowCreate(false)} />
      <BulkImportModal open={showBulkImport} onClose={() => setShowBulkImport(false)} />
    </motion.div>
  );
}

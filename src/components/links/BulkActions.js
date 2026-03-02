import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';

export default function BulkActions({ selectedCount, onBulkDelete, onClearSelection }) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
          className="flex items-center gap-3 bg-dark-elevated border-2 border-border-strong px-4 py-2"
        >
          <span className="text-sm text-text-secondary font-semibold">
            {selectedCount} selected
          </span>
          <Button variant="danger" size="sm" onClick={onBulkDelete}>
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

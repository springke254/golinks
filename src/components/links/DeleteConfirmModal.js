import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

export default function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  count = 1,
}) {
  const isMultiple = count > 1;

  return (
    <Modal open={open} onClose={onClose} title="Confirm Delete" maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-danger/10 border-2 border-danger/30 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <div>
            <p className="text-text-primary font-semibold">
              {isMultiple
                ? `Delete ${count} links?`
                : 'Delete this link?'}
            </p>
            <p className="text-sm text-text-muted mt-1">
              {isMultiple
                ? 'These links will be permanently removed. This action cannot be undone.'
                : 'This link will be permanently removed. This action cannot be undone.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={onConfirm} loading={loading} fullWidth>
            {isMultiple ? `Delete ${count} Links` : 'Delete Link'}
          </Button>
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

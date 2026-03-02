import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useBulkImport, useBulkOperationStatus } from '../../hooks/useLinks';

const STEPS = ['upload', 'preview', 'progress', 'results'];

function parseCSVPreview(text, maxRows = 5) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [], totalRows: 0 };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1, maxRows + 1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    return row;
  });
  return { headers, rows, totalRows: lines.length - 1 };
}

export default function BulkImportModal({ open, onClose }) {
  const [step, setStep] = useState('upload');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [operationId, setOperationId] = useState(null);
  const fileInputRef = useRef(null);

  const bulkImport = useBulkImport();
  const { data: opStatus } = useBulkOperationStatus(operationId);

  // Move to results when complete
  React.useEffect(() => {
    if (opStatus && (opStatus.status === 'COMPLETED' || opStatus.status === 'FAILED')) {
      setStep('results');
    }
  }, [opStatus]);

  const handleFileSelect = useCallback((e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File must be smaller than 5MB');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setPreview(parseCSVPreview(text));
    };
    reader.readAsText(selectedFile);
    setStep('preview');
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        handleFileSelect({ target: { files: [droppedFile] } });
      }
    },
    [handleFileSelect]
  );

  const handleStartImport = useCallback(() => {
    if (!file) return;
    setStep('progress');
    bulkImport.mutate(file, {
      onSuccess: (data) => {
        setOperationId(data.id);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Failed to start import');
        setStep('preview');
      },
    });
  }, [file, bulkImport]);

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setOperationId(null);
    onClose();
  };

  const handleDownloadTemplate = () => {
    const csv = 'url,slug,title,tags\nhttps://example.com,my-link,Example Link,"tag1,tag2"\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'golinks-import-template.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const progressPercent = opStatus
    ? Math.round(((opStatus.successCount + opStatus.failureCount) / Math.max(opStatus.totalRows, 1)) * 100)
    : 0;

  return (
    <Modal open={open} onClose={handleClose} title="Bulk Import Links" maxWidth="xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`w-8 h-8 flex items-center justify-center text-xs font-bold border-2 ${
                STEPS.indexOf(step) >= i
                  ? 'bg-primary text-text-inverse border-primary'
                  : 'bg-dark-elevated text-text-muted border-border-strong'
              }`}
            >
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 ${
                  STEPS.indexOf(step) > i ? 'bg-primary' : 'bg-border-strong'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border-strong hover:border-primary p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
            >
              <Upload className="w-10 h-10 text-text-muted" />
              <p className="text-text-secondary font-semibold text-sm">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-text-muted text-xs">Maximum 5MB, .csv format</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted">
                Columns: <code className="text-text-secondary">url</code>,{' '}
                <code className="text-text-secondary">slug</code> (optional),{' '}
                <code className="text-text-secondary">title</code> (optional),{' '}
                <code className="text-text-secondary">tags</code> (optional)
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-hover font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Template
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-secondary font-semibold">{file?.name}</span>
              </div>
              <span className="text-xs text-text-muted">
                {preview.totalRows} row{preview.totalRows !== 1 ? 's' : ''} found
              </span>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto border-2 border-border-strong">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border-strong bg-dark-elevated">
                    {preview.headers.map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border-strong">
                      {preview.headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-text-secondary truncate max-w-[200px]">
                          {row[h] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.totalRows > 5 && (
                <div className="text-center text-xs text-text-muted py-2 bg-dark-elevated">
                  ...and {preview.totalRows - 5} more rows
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={handleStartImport} fullWidth>
                Import {preview.totalRows} Links
              </Button>
              <Button variant="secondary" onClick={() => { setStep('upload'); setFile(null); setPreview(null); }} fullWidth>
                Back
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Progress */}
        {step === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6 py-4"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-text-secondary font-semibold">Importing links...</p>
              <p className="text-text-muted text-xs">This may take a moment</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-text-muted">
                <span>Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-dark-elevated border border-border-strong overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              {opStatus && (
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="text-success">{opStatus.successCount} succeeded</span>
                  {opStatus.failureCount > 0 && (
                    <span className="text-danger">{opStatus.failureCount} failed</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && opStatus && (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Summary */}
            <div className="flex items-center gap-3 p-4 bg-dark-elevated border-2 border-border-strong">
              {opStatus.status === 'COMPLETED' && opStatus.failureCount === 0 ? (
                <CheckCircle className="w-8 h-8 text-success flex-shrink-0" />
              ) : opStatus.status === 'FAILED' ? (
                <XCircle className="w-8 h-8 text-danger flex-shrink-0" />
              ) : (
                <AlertCircle className="w-8 h-8 text-warning flex-shrink-0" />
              )}
              <div>
                <p className="text-text-primary font-bold">
                  {opStatus.status === 'COMPLETED' && opStatus.failureCount === 0
                    ? 'Import Complete!'
                    : opStatus.status === 'FAILED'
                    ? 'Import Failed'
                    : 'Import Completed with Errors'}
                </p>
                <p className="text-text-muted text-sm">
                  {opStatus.successCount} of {opStatus.totalRows} links imported
                  {opStatus.failureCount > 0 && `, ${opStatus.failureCount} failed`}
                </p>
              </div>
            </div>

            {/* Row results */}
            {opStatus.results && opStatus.results.length > 0 && (
              <div className="max-h-48 overflow-y-auto border-2 border-border-strong">
                {opStatus.results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 text-xs border-b border-border-strong last:border-0"
                  >
                    {r.success ? (
                      <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" />
                    )}
                    <span className="text-text-secondary truncate flex-1">
                      Row {r.row}: {r.url || 'N/A'}
                    </span>
                    {r.slug && <span className="text-primary font-bold">go/{r.slug}</span>}
                    {r.error && <span className="text-danger">{r.error}</span>}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={handleClose} fullWidth>
              Done
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

import React from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  QrCode,
  Pencil,
  Trash2,
  BarChart3,
  ToggleLeft,
  ToggleRight,
  Lock,
  EyeOff,
  Zap,
  Clock,
  Hash,
  Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Badge from '../ui/Badge';
import CopyButton from '../ui/CopyButton';
import { cn } from '../../utils/cn';

dayjs.extend(relativeTime);

export default function LinkCard({
  link,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onQR,
  onToggleActive,
}) {
  const shortUrl = `${window.location.origin}/go/${link.slug}`;
  const isDeleting = link._deleting;
  const isCreating = link._creating;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDeleting ? 0.4 : isCreating ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'bg-dark-card border-2 border-border-strong p-4 space-y-3',
        selected && 'border-primary/50 bg-primary/5',
        isCreating && 'animate-pulse'
      )}
    >
      {/* Top: checkbox + slug + status + protection icons */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(link.id, e.target.checked)}
            className="w-4 h-4 accent-primary cursor-pointer flex-shrink-0 mt-0.5"
            disabled={isCreating}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {isCreating && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
              <span className="text-primary font-bold text-sm">go/{link.slug}</span>
              <CopyButton text={shortUrl} />
            </div>
            {link.title && (
              <p className="text-text-secondary text-sm truncate mt-0.5">{link.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Protection icons */}
          {link.isPasswordProtected && (
            <span title="Password Protected">
              <Lock className="w-3.5 h-3.5 text-warning" />
            </span>
          )}
          {link.isPrivate && (
            <span title="Private">
              <EyeOff className="w-3.5 h-3.5 text-text-muted" />
            </span>
          )}
          {link.isOneTime && (
            <span title="One-Time Link">
              <Zap className="w-3.5 h-3.5 text-danger" />
            </span>
          )}
          {link.expiresAt && (
            <span title={`Expires ${dayjs(link.expiresAt).fromNow()}`}>
              <Clock className="w-3.5 h-3.5 text-warning" />
            </span>
          )}
          {link.maxClicks && (
            <span title={`Max ${link.maxClicks} clicks`}>
              <Hash className="w-3.5 h-3.5 text-text-muted" />
            </span>
          )}
          <Badge variant={link.isActive !== false ? 'success' : 'danger'}>
            {link.isActive !== false ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* Destination */}
      <a
        href={link.destinationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-text-muted text-xs hover:text-text-secondary flex items-center gap-1 truncate"
      >
        {link.destinationUrl}
        <ExternalLink className="w-3 h-3 flex-shrink-0" />
      </a>

      {/* Tags */}
      {link.tags && link.tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {link.tags.map((tag) => {
            const tagName = typeof tag === 'string' ? tag : tag.name;
            return (
              <span
                key={tagName}
                className="inline-flex items-center px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium border border-primary/20"
              >
                {tagName}
              </span>
            );
          })}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>{link.clicksCount ?? 0} clicks</span>
        </div>
        <span title={link.createdAt}>{dayjs(link.createdAt).fromNow()}</span>
      </div>

      {/* Actions */}
      {!isCreating && (
        <div className="flex items-center gap-1 border-t border-border-strong pt-3">
          <button
            onClick={() => onToggleActive(link)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-text-muted hover:text-primary transition-colors"
          >
            {link.isActive !== false ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            {link.isActive !== false ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => onQR(link)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <QrCode className="w-4 h-4" />
            QR
          </button>
          <button
            onClick={() => onEdit(link)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(link)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-text-muted hover:text-danger transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </motion.div>
  );
}

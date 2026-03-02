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

export default function LinkRow({
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
    <motion.tr
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDeleting ? 0.4 : isCreating ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'border-b border-border-strong hover:bg-dark-elevated/50 transition-colors',
        selected && 'bg-primary/5',
        isCreating && 'animate-pulse'
      )}
    >
      {/* Checkbox */}
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(link.id, e.target.checked)}
          className="w-4 h-4 accent-primary cursor-pointer"
          disabled={isCreating}
        />
      </td>

      {/* Slug + Destination */}
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {isCreating && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
            <span className="text-primary font-bold text-sm">go/{link.slug}</span>
            <CopyButton text={shortUrl} />
            {/* Protection icons inline */}
            {link.isPasswordProtected && <Lock className="w-3 h-3 text-warning" title="Password Protected" />}
            {link.isPrivate && <EyeOff className="w-3 h-3 text-text-muted" title="Private" />}
            {link.isOneTime && <Zap className="w-3 h-3 text-danger" title="One-Time" />}
            {link.expiresAt && <Clock className="w-3 h-3 text-warning" title={`Expires ${dayjs(link.expiresAt).fromNow()}`} />}
            {link.maxClicks && <Hash className="w-3 h-3 text-text-muted" title={`Max ${link.maxClicks} clicks`} />}
          </div>
          <a
            href={link.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-text-muted text-xs hover:text-text-secondary truncate max-w-[300px] inline-flex items-center gap-1"
          >
            {link.destinationUrl}
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
          </a>
          {/* Tags inline */}
          {link.tags && link.tags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {link.tags.slice(0, 3).map((tag) => {
                const tagName = typeof tag === 'string' ? tag : tag.name;
                return (
                  <span
                    key={tagName}
                    className="inline-flex items-center px-1 py-0 bg-primary/10 text-primary text-[10px] font-medium border border-primary/20"
                  >
                    {tagName}
                  </span>
                );
              })}
              {link.tags.length > 3 && (
                <span className="text-[10px] text-text-muted">+{link.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <span className="text-text-secondary text-sm truncate max-w-[200px] block">
          {link.title || '—'}
        </span>
      </td>

      {/* Clicks */}
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1 text-text-secondary text-sm">
          <BarChart3 className="w-3.5 h-3.5" />
          {link.clicksCount ?? 0}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3 text-center">
        <Badge variant={link.isActive !== false ? 'success' : 'danger'}>
          {link.isActive !== false ? 'Active' : 'Inactive'}
        </Badge>
      </td>

      {/* Created */}
      <td className="px-4 py-3">
        <span className="text-text-muted text-xs" title={link.createdAt}>
          {dayjs(link.createdAt).fromNow()}
        </span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        {isCreating ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggleActive(link)}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-primary transition-colors"
              title={link.isActive !== false ? 'Deactivate' : 'Activate'}
            >
              {link.isActive !== false ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => onQR(link)}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              title="QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(link)}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(link)}
              className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-danger transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </td>
    </motion.tr>
  );
}

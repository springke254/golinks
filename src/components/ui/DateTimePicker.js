import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function DateTimePicker({
  label,
  value,
  onChange,
  error,
  min,
  className = '',
  ...props
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
        <input
          type="datetime-local"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          min={min || new Date().toISOString().slice(0, 16)}
          className={cn(
            'w-full bg-dark-elevated text-text-primary placeholder-text-muted',
            'border-2 border-border-strong rounded-none',
            'pl-11 pr-4 py-2.5 text-sm',
            'focus:outline-none focus:border-primary transition-colors duration-150',
            '[color-scheme:dark]',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-danger font-medium">{error}</p>}
    </div>
  );
}

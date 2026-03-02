import React from 'react';
import { cn } from '../../utils/cn';

const variants = {
  success: 'bg-success/20 text-success border border-success/30',
  danger: 'bg-danger/20 text-danger border border-danger/30',
  warning: 'bg-warning/20 text-warning border border-warning/30',
  neutral: 'bg-dark-muted/30 text-text-muted border border-border-strong',
};

export default function Badge({ children, variant = 'neutral', className = '' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-bold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

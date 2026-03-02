import React from 'react';
import { Link2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function Logo({ size = 'lg', showText = true, className = '' }) {
  const sizes = {
    sm: { icon: 'w-6 h-6', text: 'text-lg' },
    md: { icon: 'w-8 h-8', text: 'text-xl' },
    lg: { icon: 'w-10 h-10', text: 'text-2xl' },
    xl: { icon: 'w-14 h-14', text: 'text-3xl' },
  };

  const currentSize = sizes[size] || sizes.lg;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Link2 className={cn(currentSize.icon, 'text-primary')} strokeWidth={2.5} />
      {showText && (
        <span className={cn(currentSize.text, 'font-bold text-text-primary tracking-tight')}>
          Golinks
        </span>
      )}
    </div>
  );
}

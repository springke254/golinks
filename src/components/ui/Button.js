import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

const variants = {
  primary:
    'bg-primary text-text-inverse border-2 border-primary hover:bg-primary-hover active:bg-primary-active font-bold',
  secondary:
    'bg-dark-elevated text-text-primary border-2 border-border-strong hover:bg-dark-soft active:bg-dark-muted font-bold',
  danger:
    'bg-danger text-white border-2 border-danger hover:opacity-90 active:opacity-80 font-bold',
  ghost:
    'bg-transparent text-text-secondary border-2 border-transparent hover:bg-dark-elevated hover:text-text-primary font-bold',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  ...props
}) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'rounded-none inline-flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {children}
    </motion.button>
  );
}

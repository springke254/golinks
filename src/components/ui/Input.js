import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

const Input = forwardRef(function Input(
  {
    label,
    icon: Icon,
    error,
    type = 'text',
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <label className="block text-sm font-semibold text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-5 h-5 text-text-muted" />
          </div>
        )}
        <input
          ref={ref}
          type={inputType}
          className={cn(
            'w-full bg-dark-elevated text-text-primary placeholder-text-muted',
            'border-2 border-border-strong rounded-none',
            'px-4 py-2.5 text-sm',
            'focus:outline-none focus:border-primary transition-colors duration-150',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            Icon && 'pl-11',
            isPassword && 'pr-11',
            error && 'border-danger focus:border-danger',
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger font-medium">{error}</p>
      )}
    </div>
  );
});

export default Input;

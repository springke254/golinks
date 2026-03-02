import React from 'react';
import { getPasswordStrength } from '../../schemas/authSchemas';
import { cn } from '../../utils/cn';

export default function PasswordStrength({ password }) {
  const strength = getPasswordStrength(password);

  const requirements = [
    { met: password?.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password || ''), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password || ''), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password || ''), text: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password || ''), text: 'One special character' },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn(
              'h-1 flex-1 rounded-none transition-colors duration-200',
              level <= strength.score ? strength.color : 'bg-dark-soft'
            )}
          />
        ))}
      </div>

      {strength.label && (
        <p className={cn(
          'text-xs font-medium',
          strength.score <= 1 && 'text-danger',
          strength.score === 2 && 'text-warning',
          strength.score === 3 && 'text-primary',
          strength.score === 4 && 'text-success'
        )}>
          {strength.label}
        </p>
      )}

      {/* Requirements list */}
      <div className="space-y-1">
        {requirements.map((req, i) => (
          <p
            key={i}
            className={cn(
              'text-xs',
              req.met ? 'text-success' : 'text-text-muted'
            )}
          >
            {req.met ? '✓' : '○'} {req.text}
          </p>
        ))}
      </div>
    </div>
  );
}

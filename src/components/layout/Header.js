import React from 'react';
import { Menu, Bell } from 'lucide-react';

import Logo from '../ui/Logo';
import { useAuth } from '../../hooks/useAuth';

export default function Header({ onMenuClick }) {
  const { user } = useAuth();

  const initials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  return (
    <header className="sticky top-0 z-20 lg:hidden h-16 bg-dark-card border-b-2 border-border-strong flex items-center justify-between px-4">
      {/* Left: hamburger + logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Logo size="sm" showText />
      </div>

      {/* Right: notification + avatar */}
      <div className="flex items-center gap-2">
        <button
          className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 bg-primary flex items-center justify-center text-text-inverse text-xs font-bold">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName || 'Avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}

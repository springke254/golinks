import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Link2,
  BarChart3,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';

import Logo from '../ui/Logo';
import { ROUTES } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: ROUTES.DASHBOARD },
  { label: 'Links', icon: Link2, path: ROUTES.LINKS },
  { label: 'Analytics', icon: BarChart3, path: ROUTES.ANALYTICS },
  { label: 'Audit Trail', icon: ScrollText, path: ROUTES.AUDIT },
  { label: 'Settings', icon: Settings, path: ROUTES.SETTINGS },
];

const SIDEBAR_KEY = 'sidebar_collapsed';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const { logout } = useAuth();
  const location = useLocation();

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden lg:flex flex-col h-screen sticky top-0 bg-dark-card border-r-2 border-border-strong z-30 overflow-visible relative"
    >
      {/* Collapse toggle — floating on sidebar edge */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute top-5 -right-3 z-40 w-6 h-6 bg-dark-elevated border-2 border-border-strong flex items-center justify-center text-text-muted hover:bg-primary hover:border-primary hover:text-text-inverse transition-colors"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
      {/* Logo area */}
      <div className="flex items-center h-16 px-4 border-b-2 border-border-strong shrink-0">
        <Logo size={collapsed ? 'sm' : 'md'} showText={!collapsed} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                group flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors
                border-2
                ${
                  isActive
                    ? 'bg-primary text-text-inverse border-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated border-transparent hover:border-border-strong'
                }
              `}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-2 py-4 border-t-2 border-border-strong shrink-0">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-text-secondary hover:text-danger hover:bg-dark-elevated border-2 border-transparent hover:border-border-strong transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap overflow-hidden"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}

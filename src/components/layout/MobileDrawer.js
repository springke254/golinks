import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, Link2, BarChart3, ScrollText, Settings, LogOut } from 'lucide-react';

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

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const drawer = {
  hidden: { x: '-100%' },
  visible: { x: 0 },
};

export default function MobileDrawer({ open, onClose }) {
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdrop}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.aside
            variants={drawer}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed inset-y-0 left-0 w-72 bg-dark-card border-r-2 border-border-strong z-50 lg:hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b-2 border-border-strong shrink-0">
              <Logo size="md" showText />
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
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
                    onClick={onClose}
                    className={`
                      flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors
                      border-2
                      ${
                        isActive
                          ? 'bg-primary text-text-inverse border-primary'
                          : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated border-transparent hover:border-border-strong'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Sign out */}
            <div className="px-2 py-4 border-t-2 border-border-strong shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-text-secondary hover:text-danger hover:bg-dark-elevated border-2 border-transparent hover:border-border-strong transition-colors"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

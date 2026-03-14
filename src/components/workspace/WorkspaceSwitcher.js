import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useWorkspace } from '../../hooks/useWorkspace';
import { ROUTES } from '../../utils/constants';
import Badge from '../ui/Badge';

const ROLE_BADGE = {
  OWNER: 'success',
  ADMIN: 'warning',
  MEMBER: 'neutral',
};

export default function WorkspaceSwitcher({ collapsed = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const filtered = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSwitch = async (ws) => {
    if (ws.id === activeWorkspace?.id) {
      setOpen(false);
      return;
    }
    await switchWorkspace(ws.id);
    setOpen(false);
    setSearch('');
  };

  const handleCreate = () => {
    setOpen(false);
    setSearch('');
    navigate(ROUTES.ONBOARDING);
  };

  const handleManageMembers = () => {
    setOpen(false);
    setSearch('');
    navigate(ROUTES.SETTINGS + '?tab=team');
  };

  if (!activeWorkspace) return null;

  // Initials chip for workspace
  const wsInitial = (activeWorkspace.name || '?').charAt(0).toUpperCase();

  // Collapsed: show only icon
  if (collapsed) {
    return (
      <div className="px-2 py-3 border-b-2 border-border-strong">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center p-2 bg-dark-elevated border-2 border-border-strong hover:border-primary transition-colors !rounded-xl"
          title={activeWorkspace.name}
        >
          <div className="w-7 h-7 bg-primary/20 flex items-center justify-center rounded-lg">
            <span className="text-xs font-bold text-primary">{wsInitial}</span>
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <div ref={dropdownRef} className="absolute left-full top-16 ml-2 z-50">
              <DropdownPanel
                workspaces={filtered}
                activeWorkspace={activeWorkspace}
                search={search}
                onSearchChange={setSearch}
                onSwitch={handleSwitch}
                onCreate={handleCreate}
                onManageMembers={handleManageMembers}
              />
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Expanded
  return (
    <div className="px-3 py-3 border-b-2 border-border-strong relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-dark-elevated border-2 border-border-strong hover:border-primary transition-colors text-left !rounded-xl"
      >
        <div className="w-7 h-7 bg-primary/20 flex items-center justify-center rounded-lg shrink-0">
          <span className="text-xs font-bold text-primary">{wsInitial}</span>
        </div>
        <span className="flex-1 text-sm font-semibold text-text-primary truncate">
          {activeWorkspace.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <div className="absolute left-3 right-3 top-full mt-1 z-50">
            <DropdownPanel
              workspaces={filtered}
              activeWorkspace={activeWorkspace}
              search={search}
              onSearchChange={setSearch}
              onSwitch={handleSwitch}
              onCreate={handleCreate}
              onManageMembers={handleManageMembers}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownPanel({ workspaces, activeWorkspace, search, onSearchChange, onSwitch, onCreate, onManageMembers }) {
  const [focusIndex, setFocusIndex] = useState(-1);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  // Reset focus when search changes
  useEffect(() => {
    setFocusIndex(-1);
  }, [search]);

  // Auto-focus search input
  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, []);

  // Arrow-key navigation
  const handleKeyDown = useCallback(
    (e) => {
      const totalItems = workspaces.length;
      if (totalItems === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
      } else if (e.key === 'Enter' && focusIndex >= 0 && focusIndex < totalItems) {
        e.preventDefault();
        onSwitch(workspaces[focusIndex]);
      }
    },
    [workspaces, focusIndex, onSwitch]
  );

  // Scroll focused item into view
  useEffect(() => {
    if (focusIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[data-ws-item]');
      if (items[focusIndex]) {
        items[focusIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusIndex]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="bg-dark-card border-2 border-border-strong shadow-xl min-w-[220px] !rounded-xl overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Search */}
      <div className="p-2 border-b-2 border-border-strong">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong !rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Workspace list */}
      <div className="max-h-48 overflow-y-auto py-1" ref={listRef}>
        {workspaces.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-muted">No workspaces found</p>
        ) : (
          workspaces.map((ws, index) => {
            const isActive = ws.id === activeWorkspace?.id;
            const isFocused = index === focusIndex;
            const initial = (ws.name || '?').charAt(0).toUpperCase();
            return (
              <button
                key={ws.id}
                data-ws-item
                onClick={() => onSwitch(ws)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : isFocused
                    ? 'bg-dark-elevated text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
                }`}
              >
                <div className="w-6 h-6 bg-dark-soft flex items-center justify-center rounded-md shrink-0">
                  <span className="text-[10px] font-bold text-text-secondary">{initial}</span>
                </div>
                <span className="flex-1 text-xs font-medium truncate">{ws.name}</span>
                {ws.role && (
                  <Badge variant={ROLE_BADGE[ws.role] || 'neutral'} className="text-[9px] px-1.5 py-0">
                    {ws.role}
                  </Badge>
                )}
                {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t-2 border-border-strong p-2 space-y-0.5">
        <button
          onClick={onCreate}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-dark-elevated transition-colors rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Create workspace
        </button>
        <button
          onClick={onManageMembers}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-dark-elevated transition-colors rounded-lg"
        >
          <Users className="w-4 h-4" />
          Manage memberships
        </button>
      </div>
    </motion.div>
  );
}

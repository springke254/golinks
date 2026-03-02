import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Plus, Search, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useWorkspace } from '../../hooks/useWorkspace';
import { ROUTES, WORKSPACE_ROLES } from '../../utils/constants';
import Badge from '../ui/Badge';

const ROLE_COLORS = {
  [WORKSPACE_ROLES.OWNER]: 'primary',
  [WORKSPACE_ROLES.ADMIN]: 'info',
  [WORKSPACE_ROLES.MEMBER]: 'default',
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

  if (!activeWorkspace) return null;

  // Collapsed: show only icon
  if (collapsed) {
    return (
      <div className="px-2 py-3 border-b-2 border-border-strong">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-center p-2 bg-dark-elevated border-2 border-border-strong hover:border-primary transition-colors"
          title={activeWorkspace.name}
        >
          <Building2 className="w-5 h-5 text-primary shrink-0" />
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
        className="w-full flex items-center gap-2 px-3 py-2 bg-dark-elevated border-2 border-border-strong hover:border-primary transition-colors text-left"
      >
        <Building2 className="w-4 h-4 text-primary shrink-0" />
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
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownPanel({ workspaces, activeWorkspace, search, onSearchChange, onSwitch, onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className="bg-dark-card border-2 border-border-strong shadow-xl min-w-[220px]"
    >
      {/* Search */}
      <div className="p-2 border-b-2 border-border-strong">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-dark-elevated text-text-primary placeholder-text-muted border-2 border-border-strong rounded-none pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-primary transition-colors"
            autoFocus
          />
        </div>
      </div>

      {/* Workspace list */}
      <div className="max-h-48 overflow-y-auto py-1">
        {workspaces.length === 0 ? (
          <p className="px-3 py-2 text-xs text-text-muted">No workspaces found</p>
        ) : (
          workspaces.map((ws) => {
            const isActive = ws.id === activeWorkspace?.id;
            return (
              <button
                key={ws.id}
                onClick={() => onSwitch(ws)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-dark-elevated'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-xs font-medium truncate">{ws.name}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })
        )}
      </div>

      {/* Create workspace CTA */}
      <div className="border-t-2 border-border-strong p-2">
        <button
          onClick={onCreate}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-dark-elevated transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create workspace
        </button>
      </div>
    </motion.div>
  );
}

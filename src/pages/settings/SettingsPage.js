import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { KeyRound, Link2, Users, Building2 } from 'lucide-react';

import ActiveSessions from '../../components/auth/ActiveSessions';
import LinkedAccounts from '../../components/auth/LinkedAccounts';
import TeamMembers from '../../components/workspace/TeamMembers';
import WorkspaceSettings from '../../components/workspace/WorkspaceSettings';

const TABS = [
  { key: 'sessions', label: 'Sessions', icon: KeyRound },
  { key: 'linked', label: 'Linked Accounts', icon: Link2 },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'workspace', label: 'Workspace', icon: Building2 },
];

const VALID_TAB_KEYS = TABS.map((t) => t.key);

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    VALID_TAB_KEYS.includes(tabFromUrl) ? tabFromUrl : 'sessions'
  );

  // Sync tab from URL query param
  useEffect(() => {
    if (tabFromUrl && VALID_TAB_KEYS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account, team, and workspace.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border-strong overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[2px] transition-colors whitespace-nowrap
                ${
                  isActive
                    ? 'text-primary border-primary'
                    : 'text-text-secondary border-transparent hover:text-text-primary hover:border-border-strong'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'sessions' && <ActiveSessions />}
        {activeTab === 'linked' && <LinkedAccounts />}
        {activeTab === 'team' && <TeamMembers />}
        {activeTab === 'workspace' && <WorkspaceSettings />}
      </motion.div>
    </div>
  );
}

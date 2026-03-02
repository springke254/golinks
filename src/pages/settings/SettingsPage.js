import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Link2 } from 'lucide-react';

import ActiveSessions from '../../components/auth/ActiveSessions';
import LinkedAccounts from '../../components/auth/LinkedAccounts';

const TABS = [
  { key: 'sessions', label: 'Sessions', icon: KeyRound },
  { key: 'linked', label: 'Linked Accounts', icon: Link2 },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('sessions');

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account security and integrations.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-border-strong">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[2px] transition-colors
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
      </motion.div>
    </div>
  );
}

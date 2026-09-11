import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { 
  User, 
  Settings, 
  CreditCard, 
  Activity, 
  AlertCircle, 
  LogOut,
  Sparkles
} from 'lucide-react';

interface SettingsProps {
  onLogout: () => void;
  onNavigateToAnalyzer: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({ onLogout, onNavigateToAnalyzer }) => {
  const { user, profile } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'account' | 'usage' | 'payments'>('account');

  return (
    <div id="settings-page" className="max-w-4xl mx-auto space-y-8 py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Settings & Account
            </h1>
          </div>
          <p className="text-sm text-neutral-400 mt-1">
            Manage your manager credentials, free analysis quota, and architected billing records.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-rose-950/60 text-rose-400 border border-neutral-800 hover:border-rose-800 font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-neutral-800 gap-4 text-sm font-bold">
        {[
          { id: 'account', label: 'Account Profile' },
          { id: 'usage', label: 'Analysis Usage' },
          { id: 'payments', label: 'Payment Architecture & History' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-3 border-b-2 transition-all ${
              activeSubTab === tab.id
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Account Section */}
      {activeSubTab === 'account' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            Account Information
          </h2>

          <div className="space-y-4 max-w-lg text-sm">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 tracking-wider mb-1">
                Manager / Gamer Name
              </label>
              <input
                type="text"
                readOnly
                value={profile?.displayName || user?.displayName || 'Tactician'}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 tracking-wider mb-1">
                Registered WhatsApp / Contact
              </label>
              <input
                type="text"
                readOnly
                value={profile?.whatsappNumber || user?.whatsappNumber || user?.phoneNumber || user?.email || 'Registered'}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-emerald-400 font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-500 tracking-wider mb-1">
                Manager Account ID
              </label>
              <p className="font-mono text-xs text-neutral-400 bg-neutral-950 p-3 rounded-xl border border-neutral-800 break-all">
                {user?.uid || 'Not authenticated'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Analysis Usage Section */}
      {activeSubTab === 'usage' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Weekly Analysis Allocation
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              1 Free / Week
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase font-bold text-neutral-400">Free Analyses Remaining</span>
              <div className="text-3xl font-black text-emerald-400">
                {profile?.freeAnalysesRemaining || 1}
              </div>
              <p className="text-xs text-neutral-500">
                Resets every 7 days automatically for your account.
              </p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase font-bold text-neutral-400">Paid Credits</span>
              <div className="text-3xl font-black text-neutral-400">
                0
              </div>
              <p className="text-xs text-neutral-500">
                Paid credits are currently disabled during platform development.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToAnalyzer}
            className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Analyze Squad Now
          </button>
        </div>
      )}

      {/* 3. Payment Architecture & History (Strictly complying with Specs 24 & 25) */}
      {activeSubTab === 'payments' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-cyan-400" />
              Payment Architecture & History
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              Payments Disabled (Dev Mode)
            </span>
          </div>

          {/* Explicit Notice per Spec 25 */}
          <div className="bg-neutral-950 border border-amber-500/40 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-sm text-white">
                Paid analysis is currently unavailable while we prepare the payment system.
              </span>
              <p className="text-neutral-400 leading-relaxed">
                The database schema and architecture are fully implemented for <strong>$2 per analysis</strong>, but transactions and third-party gateways are strictly disabled during this development stage. No money will be charged.
              </p>
            </div>
          </div>

          {/* Required Spec 24: Payment History Table with empty state */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
              Transaction Records
            </h3>

            {/* Empty state per spec: "No payment transactions yet." Do not generate fake records. */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center space-y-2">
              <p className="text-sm font-semibold text-neutral-300">
                No payment transactions yet.
              </p>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Any future transactions processed once the payment provider is activated will appear here with transaction ID, amount, currency, and date.
              </p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

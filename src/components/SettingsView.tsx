import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { 
  User, 
  Settings, 
  CreditCard, 
  Activity, 
  AlertCircle, 
  LogOut,
  Sparkles,
  Trash2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  X
} from 'lucide-react';

interface SettingsProps {
  onLogout: () => void;
  onNavigateToAnalyzer: () => void;
  onAccountDeleted?: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({
  onLogout,
  onNavigateToAnalyzer,
  onAccountDeleted
}) => {
  const { user, profile, deleteAccount } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'account' | 'usage' | 'payments'>('account');

  // Account deletion states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account deletion.');
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      await deleteAccount();
      setShowDeleteModal(false);
      if (onAccountDeleted) {
        onAccountDeleted();
      } else {
        onLogout();
      }
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

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

            {/* Danger Zone: Delete Account */}
            <div className="pt-6 mt-6 border-t border-neutral-800 space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-rose-400">Danger Zone</h3>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 max-w-md">
                  <h4 className="text-sm font-bold text-white">Delete Manager Account</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Permanently delete your manager profile, tactical history, saved squads, and authentication credentials. Once deleted, your account cannot be recovered.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmationText('');
                    setDeleteError(null);
                    setShowDeleteModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all flex items-center justify-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Account</span>
                </button>
              </div>
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

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-rose-900/60 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => {
                if (!isDeleting) setShowDeleteModal(false);
              }}
              className="absolute top-5 right-5 text-neutral-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-white">Permanently Delete Account?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                This action is <strong className="text-rose-400">permanent and irreversible</strong>. All your data associated with <span className="text-white font-mono font-semibold">{profile?.displayName || user?.displayName || user?.email || user?.whatsappNumber}</span> will be permanently erased:
              </p>
            </div>

            <ul className="text-xs text-neutral-300 space-y-2 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Manager Profile & Unique Account ID</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>All saved squads, custom tactics & bench formations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Tactical analysis reports and history</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>WhatsApp and Email authentication credentials</span>
              </li>
            </ul>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs text-neutral-400 font-semibold">
                To confirm, type <strong className="text-white tracking-widest font-mono">DELETE</strong> below:
              </label>
              <input
                type="text"
                disabled={isDeleting}
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white font-mono text-sm tracking-wider outline-none"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting || deleteConfirmationText.trim().toUpperCase() !== 'DELETE'}
                onClick={handleDeleteAccount}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-black text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

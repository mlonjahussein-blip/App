import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  CheckCircle2,
  Calendar,
  MessageSquareText,
  Send,
  X
} from 'lucide-react';
import { UserEntitlements, PaymentRecord } from '../types.ts';
import { PaymentModal } from './PaymentModal.tsx';

interface SettingsProps {
  initialSubTab?: 'account' | 'usage' | 'payments' | 'feedback';
  onLogout: () => void;
  onNavigateToAnalyzer: () => void;
  onAccountDeleted?: () => void;
}

export const SettingsView: React.FC<SettingsProps> = ({
  initialSubTab = 'account',
  onLogout,
  onNavigateToAnalyzer,
  onAccountDeleted
}) => {
  const { user, profile, deleteAccount, changePassword } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'account' | 'usage' | 'payments' | 'feedback'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Feedback states
  const [feedbackName, setFeedbackName] = useState(profile?.displayName || user?.displayName || '');
  const [feedbackEmail, setFeedbackEmail] = useState(profile?.email || user?.email || '');
  const [feedbackCategory, setFeedbackCategory] = useState('Tactical & Squad Query');
  const [feedbackSubject, setFeedbackSubject] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.displayName || user?.displayName) {
      setFeedbackName(profile?.displayName || user?.displayName || '');
    }
    if (profile?.email || user?.email) {
      setFeedbackEmail(profile?.email || user?.email || '');
    }
  }, [profile, user]);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Account deletion states
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Entitlements & Payment state
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isResettingTestQuota, setIsResettingTestQuota] = useState<boolean>(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  const fetchEntitlements = async () => {
    const uid = user?.uid || 'guest';
    try {
      const res = await fetch(`/api/user/entitlements?userId=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data: UserEntitlements = await res.json();
        setEntitlements(data);
      }
    } catch (e) {
      console.warn('Error fetching user entitlements in SettingsView:', e);
    }
  };

  const fetchPaymentHistory = async () => {
    const uid = user?.uid || 'guest';
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/payment/history?userId=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          setPaymentHistory(data.history);
        }
      }
    } catch (e) {
      console.warn('Error fetching payment history in SettingsView:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
    if (activeSubTab === 'payments') {
      fetchPaymentHistory();
    }
  }, [user?.uid, activeSubTab]);

  const handleTestResetQuota = async () => {
    const uid = user?.uid || 'guest';
    setIsResettingTestQuota(true);
    setSettingsNotice(null);
    try {
      const res = await fetch('/api/payment/test-reset-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid })
      });
      if (res.ok) {
        setSettingsNotice('Weekly free analysis reset to 1 (Test Mode).');
        await fetchEntitlements();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsResettingTestQuota(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMessage('Password successfully updated! Your new password will be required for future sign-ins.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to change password. Please verify your current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

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

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccessMessage(null);
    setFeedbackErrorMessage(null);

    if (!feedbackEmail.trim()) {
      setFeedbackErrorMessage('Please provide a valid email address so we can reach you.');
      return;
    }

    if (!feedbackMessage.trim()) {
      setFeedbackErrorMessage('Please write your queries, suggestions, questions, or feedback.');
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      let submissionSuccess = false;
      let submissionMessage = '';

      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.uid,
            name: feedbackName.trim() || 'Manager',
            email: feedbackEmail.trim(),
            category: feedbackCategory,
            subject: feedbackSubject.trim(),
            message: feedbackMessage.trim()
          })
        });

        // Safely parse text response to prevent JSON.parse crashes on non-JSON payloads
        const text = await res.text();
        let data: any = null;
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }

        if (res.ok && data?.success) {
          submissionSuccess = true;
          submissionMessage = data.message || 'Thank you for reaching out! Your feedback and queries have been submitted successfully.';
        } else if (data?.error) {
          throw new Error(data.error);
        }
      } catch (networkOrApiErr: any) {
        console.warn('Backend /api/feedback encountered an issue, proceeding to database fallback:', networkOrApiErr);
      }

      // If backend API succeeded, we're done. Otherwise fallback to direct Firestore REST storage
      if (!submissionSuccess) {
        try {
          const PROJECT_ID = 'emergent-fastness-8lcf1';
          const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
          const API_KEY = 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
          const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;
          const feedbackId = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

          const firestoreRes = await fetch(`${BASE_REST_URL}/feedbacks/${feedbackId}?key=${API_KEY}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                id: { stringValue: feedbackId },
                userId: { stringValue: user?.uid || 'anonymous' },
                name: { stringValue: feedbackName.trim() || 'Manager' },
                email: { stringValue: feedbackEmail.trim() },
                category: { stringValue: feedbackCategory },
                subject: { stringValue: feedbackSubject.trim() },
                message: { stringValue: feedbackMessage.trim() },
                createdAt: { stringValue: new Date().toISOString() }
              }
            })
          });

          if (firestoreRes.ok) {
            submissionSuccess = true;
            submissionMessage = 'Thank you for reaching out! Your feedback and queries have been recorded successfully. Our team will review them promptly.';
          }
        } catch (dbErr) {
          console.error('Direct Firestore fallback error:', dbErr);
        }
      }

      if (submissionSuccess) {
        setFeedbackSuccessMessage(submissionMessage || 'Thank you for reaching out! Your feedback and queries have been submitted successfully. If follow-up is needed, we will get back to you directly at your provided email.');
        setFeedbackSubject('');
        setFeedbackMessage('');
      } else {
        throw new Error('Failed to submit feedback. Please check your network connection and try again.');
      }
    } catch (err: any) {
      console.error('Feedback submit error:', err);
      setFeedbackErrorMessage(err?.message || 'Failed to send feedback. Please check your connection and try again.');
    } finally {
      setIsSubmittingFeedback(false);
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
            Manage your manager credentials, free analysis quota, architected billing records, and queries.
          </p>
        </div>

        <button
          onClick={onLogout}
          className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-rose-950/60 text-rose-400 border border-neutral-800 hover:border-rose-800 font-bold text-xs flex items-center gap-2 transition-all self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap border-b border-neutral-800 gap-4 text-sm font-bold">
        {[
          { id: 'account', label: 'Account Profile' },
          { id: 'usage', label: 'Analysis Usage' },
          { id: 'payments', label: 'Payment Architecture & History' },
          { id: 'feedback', label: 'Feedback' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`pb-3 border-b-2 transition-all cursor-pointer ${
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

            {/* Change Password Section */}
            <div className="pt-6 mt-6 border-t border-neutral-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" />
                Change Sign-In Password
              </h3>
              <p className="text-xs text-neutral-400">
                Update your account password. Your new password will be required for subsequent sign-ins across all devices.
              </p>

              <form onSubmit={handlePasswordChange} className="space-y-3 pt-2">
                {passwordMessage && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs rounded-xl">
                    {passwordMessage}
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs rounded-xl">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    New Password (min 6 characters)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neutral-400 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
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
              Weekly Analysis Allocation & Credits
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              1 Free / Week
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase font-bold text-neutral-400">Free Analyses Remaining</span>
              <div className="text-3xl font-black text-emerald-400">
                {entitlements ? entitlements.freeAnalysesRemaining : (profile?.freeAnalysesRemaining ?? 1)}
              </div>
              <p className="text-xs text-neutral-500">
                Resets every 7 days automatically for your account.
              </p>
              {entitlements?.nextFreeResetDate && (
                <div className="pt-2 text-[11px] text-neutral-400 flex items-center gap-1.5 border-t border-neutral-900">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Next reset: {new Date(entitlements.nextFreeResetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-2">
              <span className="text-xs uppercase font-bold text-neutral-400">Paid Analysis Credits</span>
              <div className="text-3xl font-black text-cyan-400">
                {entitlements ? entitlements.paidAnalysisCredits : (profile?.paidCredits ?? 0)}
              </div>
              <p className="text-xs text-neutral-500">
                Purchased credits never expire and carry over between weeks.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Get Additional Credits ({entitlements?.priceDisplay || '$0.00 USD'})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test Mode Quota Control */}
          {entitlements?.testMode && (
            <div className="bg-neutral-950 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Test Mode Controls Active ($0.00 USD)
                </span>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  You can reset your weekly free quota at any time during testing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isResettingTestQuota}
                  onClick={handleTestResetQuota}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResettingTestQuota ? 'animate-spin' : ''}`} />
                  <span>Reset Free Quota</span>
                </button>
              </div>
            </div>
          )}

          {settingsNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{settingsNotice}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onNavigateToAnalyzer}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Squad Now
            </button>
          </div>
        </div>
      )}

      {/* 3. Payment Architecture & History */}
      {activeSubTab === 'payments' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                Payment Architecture & History
              </h2>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {entitlements?.testMode && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Test Mode Active ($0.00 USD)
                </span>
              )}

              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black transition-all shadow-md cursor-pointer"
              >
                + Buy Credit
              </button>
            </div>
          </div>

          {/* Architecture Status Info Card */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Supported Gateway & Pricing
              </span>
              <span className="text-emerald-400 font-mono text-[11px] font-bold">
                Rate: $2.00 USD / Credit
              </span>
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Every registered user receives <strong>1 free analysis per week</strong>. Additional analyses require 1 paid credit ($2.00 USD). Payments are securely processed via <strong>Pesapal</strong>, supporting <strong>Debit & Credit Cards (Visa, Mastercard, American Express with 3D Secure)</strong> and <strong>Mobile Money (M-Pesa, Airtel Money, MTN MoMo)</strong>.
            </p>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-wider">
                Transaction Records ({paymentHistory.length})
              </h3>
              <button
                type="button"
                onClick={fetchPaymentHistory}
                disabled={isLoadingHistory}
                className="text-xs text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center text-xs text-neutral-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-neutral-400" />
                Loading payment records...
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-neutral-300">
                  No payment transactions recorded yet.
                </p>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  When you complete a payment via Pesapal (Cards or Mobile Money), verified transactions will be logged here.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-colors cursor-pointer"
                >
                  Buy Analysis Credit ($2.00 USD)
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {paymentHistory.map((rec) => (
                  <div
                    key={rec.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm capitalize">
                          {rec.provider.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          rec.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : rec.status === 'FAILED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {rec.status}
                        </span>
                        {rec.isTestMode && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-800 text-neutral-400">
                            TEST
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        TX: {rec.providerTransactionId}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {new Date(rec.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 border-neutral-900 pt-2 sm:pt-0">
                      <div className="font-black text-sm text-white">
                        {rec.isTestMode ? '$0.00 USD' : `$${(rec.amount || 2).toFixed(2)} USD`}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        +{rec.creditAmount || 1} Analysis Credit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 4. Feedback Section */}
      {activeSubTab === 'feedback' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquareText className="w-5 h-5 text-emerald-400" />
                Feedback, Suggestions & Queries
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Have questions, tactical ideas, feature suggestions, or database corrections? Submit your message directly to our tactical development team.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold self-start sm:self-auto">
              Direct Support
            </span>
          </div>

          {feedbackSuccessMessage && (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-white text-sm">Feedback Sent Successfully!</p>
                <p className="leading-relaxed">{feedbackSuccessMessage}</p>
              </div>
            </div>
          )}

          {feedbackErrorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{feedbackErrorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitFeedback} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Manager Name */}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                  Your Name / Manager Handle <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={feedbackName}
                  onChange={(e) => setFeedbackName(e.target.value)}
                  placeholder="e.g. Tactician Pep"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none transition-colors"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                  Your Reply Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                />
                <p className="text-[10px] text-neutral-500 mt-1">
                  We will use this email if our team needs to reply to your inquiry.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={feedbackCategory}
                  onChange={(e) => setFeedbackCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm font-semibold outline-none transition-colors cursor-pointer"
                >
                  <option value="Tactical & Squad Query">Tactical & Squad Query</option>
                  <option value="Feature Suggestion">Feature Suggestion</option>
                  <option value="Report a Bug / Issue">Report a Bug / Issue</option>
                  <option value="Player & Database Correction">Player & Database Correction</option>
                  <option value="General Feedback">General Feedback</option>
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                  Subject / Topic (Optional)
                </label>
                <input
                  type="text"
                  value={feedbackSubject}
                  onChange={(e) => setFeedbackSubject(e.target.value)}
                  placeholder="e.g. Suggestion for Wing Play analysis"
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors"
                />
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                Your Queries, Suggestions, Questions or Feedback <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Write your suggestions, questions, or detailed feedback here..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-4 text-white text-sm leading-relaxed outline-none transition-colors resize-y"
              />
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingFeedback || !feedbackMessage.trim() || !feedbackEmail.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                {isSubmittingFeedback ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting Feedback...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Feedback</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Checkout Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        userId={user?.uid || 'guest'}
        userEmail={user?.email || undefined}
        displayName={user?.displayName || undefined}
        entitlements={entitlements}
        onPaymentSuccess={() => {
          fetchEntitlements();
          fetchPaymentHistory();
        }}
      />

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

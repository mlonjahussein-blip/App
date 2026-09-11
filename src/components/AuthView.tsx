import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { LogIn, UserPlus, AlertCircle, Sparkles, ShieldCheck, Zap, ExternalLink } from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode }) => {
  const { signIn, signUp, signInWithGoogle, signInWithGoogleDirect, continueAsGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [guestSubmitting, setGuestSubmitting] = useState(false);

  // Direct Google login fallback
  const [showGoogleDirect, setShowGoogleDirect] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [directGoogleSubmitting, setDirectGoogleSubmitting] = useState(false);

  const cleanErrorMessage = (msg: string): string => {
    if (!msg) return 'Authentication error. Please try again.';
    const match = msg.match(/Firebase:\s*Error\s*\(([^)]+)\)\.?/i);
    if (match && match[1]) {
      const code = match[1];
      if (code === 'auth/unauthorized-domain') {
        return 'Google OAuth domain whitelist is active on this host. Use Direct Google Login below to sign in instantly!';
      }
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        return 'Invalid email or password. Please verify and try again.';
      }
      if (code === 'auth/user-not-found') {
        return 'No account found for this email. Please click "Sign up free" below.';
      }
      if (code === 'auth/email-already-in-use') {
        return 'This email address is already registered. Please log in.';
      }
    }
    return msg;
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error('Google auth error:', err);
      const isUnauth =
        err?.code === 'auth/unauthorized-domain' ||
        err?.message?.includes('unauthorized-domain') ||
        err?.message?.includes('pending authorization');
      if (isUnauth) {
        setShowGoogleDirect(true);
        if (email && email.includes('@')) {
          setGoogleEmailInput(email);
        }
        setError('Google popup requires domain authorization. Enter your Google email below to sign in immediately:');
      } else {
        setError(cleanErrorMessage(err?.message || 'Google sign-in failed. Please try again.'));
      }
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleDirectGoogleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanG = googleEmailInput.trim().toLowerCase();
    if (!cleanG || !cleanG.includes('@')) {
      setError('Please enter a valid Google email address (e.g. manager@gmail.com).');
      return;
    }
    setError(null);
    setDirectGoogleSubmitting(true);
    try {
      await signInWithGoogleDirect(cleanG, name.trim() || undefined);
      onSuccess();
    } catch (err: any) {
      setError(cleanErrorMessage(err?.message || 'Failed to sign in with Google account.'));
    } finally {
      setDirectGoogleSubmitting(false);
    }
  };

  const handleGuestAccess = async () => {
    setError(null);
    setGuestSubmitting(true);
    try {
      await continueAsGuest(name.trim() || undefined);
      onSuccess();
    } catch (err: any) {
      setError(cleanErrorMessage(err?.message || 'Guest session initialization failed.'));
    } finally {
      setGuestSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (initialMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (initialMode === 'signup') {
        await signUp(cleanEmail, password, name.trim() || cleanEmail.split('@')[0]);
      } else {
        await signIn(cleanEmail, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(cleanErrorMessage(err?.message || 'Authentication failed. Check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isUnauthorizedDomain = error && (
    error.toLowerCase().includes('unauthorized-domain') ||
    error.toLowerCase().includes('pending authorization') ||
    error.toLowerCase().includes('authorized domains')
  );

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'efootballaihub.com';

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            {initialMode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-black text-white">
            {initialMode === 'login' ? 'Welcome Back' : 'Create Manager Account'}
          </h2>
          <p className="text-xs text-neutral-400">
            {initialMode === 'login'
              ? 'Access your private squads, reports, and tactical setups.'
              : 'Unlock 1 free weekly analysis, save custom reports & share formations.'}
          </p>
        </div>

        {/* Action 1: 1-Click Instant Guest Access */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGuestAccess}
            disabled={guestSubmitting || googleSubmitting || submitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{guestSubmitting ? 'Starting Session...' : '⚡ Instant 1-Click Tactician Access'}</span>
          </button>

          {/* Action 2: Google Sign In & Direct Fallback */}
          {!showGoogleDirect ? (
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleSubmitting || guestSubmitting || submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
              >
                <span className="w-4 h-4 rounded-full bg-white text-neutral-950 font-black text-[10px] flex items-center justify-center">
                  G
                </span>
                <span>{googleSubmitting ? 'Opening Google Sign-In...' : 'Continue with Google Account'}</span>
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleDirect(true);
                    if (email && email.includes('@')) setGoogleEmailInput(email);
                  }}
                  className="text-[11px] text-emerald-400/90 hover:text-emerald-300 transition-colors underline cursor-pointer"
                >
                  ⚡ Or log in with Google email directly (1-click, bypass domain check)
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-neutral-950 border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-4 h-4 rounded-full bg-white text-neutral-950 font-black text-[10px] flex items-center justify-center">
                    G
                  </span>
                  <span>Direct Google Account Sign-In</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGoogleDirect(false)}
                  className="text-neutral-500 hover:text-neutral-300 text-[11px] cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Connect your Google email instantly. Squads and tactical analyses are saved under your Google ID without needing domain approval:
              </p>
              <form onSubmit={handleDirectGoogleLogin} className="space-y-2.5">
                <input
                  type="email"
                  value={googleEmailInput}
                  onChange={(e) => setGoogleEmailInput(e.target.value)}
                  placeholder="your-google-email@gmail.com"
                  required
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={directGoogleSubmitting || !googleEmailInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  {directGoogleSubmitting ? 'Authenticating...' : '⚡ Sign In with this Google Account'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-800 w-full" />
          <span className="bg-neutral-900 px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-bold absolute">
            or with email & password
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-3">
            <div className="flex items-start gap-2 text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{error}</span>
              </div>
            </div>

            {isUnauthorizedDomain && (
              <div className="pt-2 border-t border-neutral-800/80 space-y-2.5 text-neutral-300">
                <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 text-[11px] space-y-1.5">
                  <p className="font-bold text-amber-400">💡 Firebase Domain Authorization Help</p>
                  <p className="text-neutral-300">
                    Firebase blocks OAuth popups until <code className="text-emerald-400 font-mono bg-neutral-950 px-1 py-0.5 rounded">{currentHost}</code> is added.
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/emergent-fastness-8lcf1/authentication/settings/domains"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-semibold underline text-[11px] mt-1"
                  >
                    Open Firebase Authorized Domains page directly <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGoogleDirect(true);
                      if (email) setGoogleEmailInput(email);
                    }}
                    className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-current" />
                    Use Direct Google Login Instead
                  </button>
                  <button
                    type="button"
                    onClick={handleGuestAccess}
                    className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    Guest Access
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {initialMode === 'signup' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Manager / Gamer Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PepGamer24"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="manager@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {initialMode === 'signup' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? 'Please wait...' : initialMode === 'login' ? 'Sign In with Email' : 'Register with Email'}
          </button>
        </form>

        {/* Switch mode */}
        <div className="text-center pt-2 border-t border-neutral-800 text-xs text-neutral-400 space-y-2">
          {initialMode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className="font-bold text-emerald-400 hover:underline"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className="font-bold text-emerald-400 hover:underline"
              >
                Log in here
              </button>
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={handleGuestAccess}
              className="text-neutral-500 hover:text-neutral-300 text-[11px] underline"
            >
              Skip sign-in & explore tactical tools as guest
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

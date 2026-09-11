import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import { LogIn, UserPlus, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode }) => {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (initialMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setSubmitting(true);
    try {
      if (initialMode === 'signup') {
        await signUp(email, password, name || email.split('@')[0]);
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Authentication failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOperationNotAllowed = error && (
    error.includes('operation-not-allowed') ||
    error.includes('disabled in your Firebase console')
  );

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

        {/* Primary 1-Click Action: Google Sign In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleSubmitting || submitting}
          className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
        >
          {/* Neutral Google G icon via styled SVG circle or clean lucide icon */}
          <span className="w-5 h-5 rounded-full bg-neutral-900 text-white font-black text-xs flex items-center justify-center">
            G
          </span>
          <span>{googleSubmitting ? 'Signing in with Google...' : 'Continue with Google (Recommended)'}</span>
        </button>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-800 w-full" />
          <span className="bg-neutral-900 px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-bold absolute">
            or with email
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{error}</span>
                {isOperationNotAllowed && (
                  <div className="pt-1">
                    <p className="text-[11px] text-neutral-300 mb-2">
                      In Firebase projects, Email/Password must be turned on in Firebase Console, whereas Google Sign-In is active by default.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs inline-flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Sign In with Google Instead
                    </button>
                  </div>
                )}
              </div>
            </div>
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
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? 'Please wait...' : initialMode === 'login' ? 'Sign In to Hub' : 'Register Manager Account'}
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
              onClick={onSuccess}
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

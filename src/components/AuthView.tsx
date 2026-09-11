import React, { useState, useEffect, useRef } from 'react';
import { useAuth, GOOGLE_CLIENT_ID, parseJwt } from '../lib/AuthContext.tsx';
import { LogIn, UserPlus, AlertCircle, Lock, Sparkles, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode }) => {
  const { signIn, signUp, signInWithGoogle, authenticateWithGooglePayload } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    let checkInterval: any = null;
    const setupGis = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response: any) => {
              if (response?.credential) {
                const payload = parseJwt(response.credential);
                if (payload && payload.email) {
                  setGoogleSubmitting(true);
                  setError(null);
                  try {
                    await authenticateWithGooglePayload({
                      sub: payload.sub,
                      email: payload.email,
                      name: payload.name,
                      picture: payload.picture
                    });
                    onSuccess();
                  } catch (err: any) {
                    setError(err.message || 'Failed to authenticate with Google.');
                  } finally {
                    setGoogleSubmitting(false);
                  }
                }
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true
          });

          // Attempt to prompt One Tap if user is already signed into Google
          try {
            (window as any).google.accounts.id.prompt();
          } catch {}
        } catch (e) {
          console.warn('GIS init warning:', e);
        }
        return true;
      }
      return false;
    };

    if (!setupGis()) {
      checkInterval = setInterval(() => {
        if (setupGis()) {
          clearInterval(checkInterval);
        }
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const cleanErrorMessage = (msg: string): string => {
    if (!msg) return 'Authentication error. Please try again.';
    const match = msg.match(/Firebase:\s*Error\s*\(([^)]+)\)\.?/i);
    if (match && match[1]) {
      const code = match[1];
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        return 'Incorrect email or password. Please verify and try again.';
      }
      if (code === 'auth/user-not-found') {
        return 'No account found for this email. Click "Sign up free" below to create one.';
      }
      if (code === 'auth/email-already-in-use') {
        return 'This email address is already registered. Please log in.';
      }
      if (code === 'auth/weak-password') {
        return 'Password should be at least 6 characters.';
      }
      if (code === 'auth/popup-closed-by-user') {
        return 'Google Sign-In popup was closed. Please try again.';
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
      setError(cleanErrorMessage(err?.message || 'Google sign-in could not complete. Please try again.'));
    } finally {
      setGoogleSubmitting(false);
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
      setError('Passwords do not match. Please check your password confirmation.');
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

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            {initialMode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {initialMode === 'login' ? 'Welcome Back' : 'Create Manager Account'}
          </h2>
          <p className="text-xs text-neutral-400">
            {initialMode === 'login'
              ? 'Access your private squad analyses, tactical setups, and saved reports.'
              : 'Unlock 1 free weekly tactical analysis, save custom squads & share tactical formations.'}
          </p>
        </div>

        {/* Option 2: Continue with Google (Direct Google Identity Services) */}
        <div className="space-y-2">
          <div ref={googleBtnRef} className="hidden" />
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting || submitting}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 hover:shadow-lg"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleSubmitting ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Instant Google Single Sign-On (Direct &amp; Free)</span>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs flex items-start gap-2.5 text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-neutral-800 w-full" />
          <span className="bg-neutral-900 px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-bold absolute">
            or with email & password
          </span>
        </div>

        {/* Option 1: Standard Email & Password Form (Zero Firebase lock, secure salted hash) */}
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
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
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
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Please wait...' : initialMode === 'login' ? 'Sign In' : 'Create Free Account'}</span>
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="text-center pt-2 border-t border-neutral-800 text-xs text-neutral-400">
          {initialMode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className="font-bold text-emerald-400 hover:underline cursor-pointer"
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
                className="font-bold text-emerald-400 hover:underline cursor-pointer"
              >
                Log in here
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};


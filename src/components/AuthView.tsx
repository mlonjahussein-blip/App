import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import {
  POPULAR_COUNTRIES,
  CountryCodeItem,
  formatFullWhatsAppNumber,
  cleanPhoneDigits
} from '../lib/whatsappAuth.ts';
import { CountryCodeSelector } from './CountryCodeSelector.tsx';
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  Phone,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode }) => {
  const { signIn, signUp, sendEmailOtpCode } = useAuth();
  const mode = initialMode; // 'login' | 'signup'

  // Form Fields
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(POPULAR_COUNTRIES[0]); // Tanzania (+255)
  const [localPhone, setLocalPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Verification Step: 'form' | 'otp'
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Resend Timer Countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first digit box when moving to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Reset errors and step when switching modes
  useEffect(() => {
    setError(null);
    setInfoMessage(null);
    setStep('form');
    setOtpDigits(['', '', '', '', '', '']);
  }, [mode]);

  const getFullWhatsAppNumber = (): string => {
    if (!localPhone.trim()) return '';
    return formatFullWhatsAppNumber(selectedCountry.dialCode, localPhone);
  };

  // --- SUBMIT HANDLERS ---

  // 1. Sign In (Email or WhatsApp Number + Password)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const identifier = email.trim();
    if (!identifier) {
      setError('Please enter your email or WhatsApp number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(identifier, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please check your email/phone and password.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Request 6-Digit Email Verification Code (Sign Up Step 1)
  const handleRequestVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanName = managerName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const fullPhone = getFullWhatsAppNumber();

    if (!cleanName) {
      setError('Please enter your Manager / Gamer name (e.g. PepGamer24).');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (localPhone.trim()) {
      const digits = cleanPhoneDigits(fullPhone);
      if (digits.length < 7) {
        setError('Please enter a valid WhatsApp phone number.');
        return;
      }
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await sendEmailOtpCode(cleanEmail, cleanName);
      setStep('otp');
      setResendCooldown(60);
      setInfoMessage(`A 6-digit verification code was sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Complete Registration with 6-Digit Email OTP (Sign Up Step 2)
  const handleVerifyAndRegister = async (overrideCode?: string) => {
    setError(null);
    setInfoMessage(null);

    const codeToVerify = (overrideCode || otpDigits.join('')).trim();
    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const fullPhone = getFullWhatsAppNumber();

    setSubmitting(true);
    try {
      await signUp(
        cleanEmail,
        password,
        managerName.trim(),
        codeToVerify,
        fullPhone || undefined
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend 6-Digit Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      await sendEmailOtpCode(cleanEmail, managerName.trim() || undefined);
      setResendCooldown(60);
      setInfoMessage(`New 6-digit verification code sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 6-Digit Box Input Navigation
  const handleOtpDigitChange = (index: number, val: string) => {
    const rawVal = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (rawVal.length > 1) {
      // Pasted multiple digits
      const pasted = rawVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      if (pasted.length === 6) {
        handleVerifyAndRegister(pasted.join(''));
      } else {
        const nextIdx = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIdx]?.focus();
      }
      return;
    }

    newDigits[index] = rawVal ? rawVal.slice(-1) : '';
    setOtpDigits(newDigits);

    if (rawVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '') && newDigits.join('').length === 6) {
      handleVerifyAndRegister(newDigits.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted) {
      const newDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      if (pasted.length === 6) {
        handleVerifyAndRegister(pasted);
      } else {
        const nextIdx = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIdx]?.focus();
      }
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 sm:px-0">
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden backdrop-blur-xl">
        {/* Glow ambient accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Branding */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {mode === 'login' ? 'Sign In to AI Hub' : step === 'otp' ? 'Verify Email Code' : 'Create Manager Account'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Access your squad builder, AI tactical reports & saved formations.'
              : step === 'otp'
              ? `Enter the 6-digit code sent to ${email}`
              : 'Sign up with email, password & link your WhatsApp number.'}
          </p>
        </div>

        {/* Feedback Notifications */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {infoMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{infoMessage}</div>
          </div>
        )}

        {/* --- SIGN IN FORM --- */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Email Address or WhatsApp Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com or +255..."
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-neutral-500" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* --- SIGN UP FORM: STEP 1 (DETAILS & WHATSAPP) --- */}
        {mode === 'signup' && step === 'form' && (
          <form onSubmit={handleRequestVerificationCode} className="space-y-4 relative">
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Manager / Gamer Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. PepGamer24"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-emerald-400 text-[10px] lowercase">(Receives 6-Digit Code)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Integrated WhatsApp Number */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                WhatsApp Phone Number <span className="text-neutral-500 text-[10px] lowercase">(Integrated Profile)</span>
              </label>
              <div className="flex gap-2">
                <div className="w-36 shrink-0">
                  <CountryCodeSelector
                    selectedCountry={selectedCountry}
                    onSelectCountry={setSelectedCountry}
                  />
                </div>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Phone className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="tel"
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder="786 427 711"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
                  />
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Linked to your tactical account for WhatsApp support and direct manager login.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full pl-10 pr-11 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-neutral-500" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* --- SIGN UP FORM: STEP 2 (6-DIGIT EMAIL CODE ENTRY) --- */}
        {mode === 'signup' && step === 'otp' && (
          <div className="space-y-5 relative animate-in fade-in">
            {/* Account Summary Banner */}
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Verifying Email:</span>
                <span className="font-bold text-white">{email}</span>
              </div>
              {localPhone.trim() && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400">Linked WhatsApp:</span>
                  <span className="font-mono text-emerald-400">{getFullWhatsAppNumber()}</span>
                </div>
              )}
            </div>

            {/* 6-Digit Individual Code Input Boxes */}
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider text-center mb-3">
                Enter 6-Digit Verification Code
              </label>
              <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
                  />
                ))}
              </div>
            </div>

            {/* Email Dispatch Info */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/20 text-xs flex items-start gap-2.5 text-neutral-400">
              <Mail className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Code sent to your email. Please check your inbox and spam folder.
              </p>
            </div>

            {/* Verify & Register Button */}
            <button
              type="button"
              onClick={() => handleVerifyAndRegister()}
              disabled={submitting || otpDigits.some((d) => d === '')}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Create Account</span>
                </>
              )}
            </button>

            {/* Step 2 Actions (Resend & Back to Edit) */}
            <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || submitting}
                className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-40 disabled:hover:text-emerald-400 cursor-pointer"
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        )}

        {/* Footer Mode Switcher */}
        <div className="mt-6 pt-5 border-t border-neutral-800/80 text-center text-xs text-neutral-400">
          {mode === 'login' ? (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('signup')}
                className="text-emerald-400 hover:text-emerald-300 font-bold ml-1 transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onSwitchMode('login')}
                className="text-emerald-400 hover:text-emerald-300 font-bold ml-1 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

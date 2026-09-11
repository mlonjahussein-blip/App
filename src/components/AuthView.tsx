import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext.tsx';
import {
  POPULAR_COUNTRIES,
  CountryCodeItem,
  formatFullWhatsAppNumber,
  cleanPhoneDigits
} from '../lib/whatsappAuth.ts';
import {
  Phone,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  MessageCircle
} from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode }) => {
  const {
    signInWithWhatsApp,
    signUpWithWhatsApp,
    sendWhatsAppOtpCode,
    signInWithWhatsAppOtp,
    signIn
  } = useAuth();

  // Mode: login or signup
  const mode = initialMode;

  // Form Fields
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(POPULAR_COUNTRIES[0]); // Default Tanzania (+255)
  const [localPhone, setLocalPhone] = useState('');
  const [managerName, setManagerName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification Step
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSentPhone, setOtpSentPhone] = useState<string>('');
  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [whatsappLink, setWhatsappLink] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Alternative login toggle (for users who previously used email)
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [emailInput, setEmailInput] = useState('');

  // UI States
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // OTP input refs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  const getFullPhoneNumber = (): string => {
    return formatFullWhatsAppNumber(selectedCountry.dialCode, localPhone);
  };

  // 1. Trigger WhatsApp OTP Dispatch (Step 1 -> Step 2)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const fullPhone = getFullPhoneNumber();
    const digits = cleanPhoneDigits(fullPhone);

    if (digits.length < 7) {
      setError('Please enter a valid WhatsApp phone number.');
      return;
    }

    if (mode === 'signup') {
      if (!managerName.trim()) {
        setError('Please enter your Manager / Gamer name (e.g. PepGamer24).');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const resp = await sendWhatsAppOtpCode(
        fullPhone,
        managerName.trim() || undefined,
        mode === 'signup' ? 'signup' : 'signin'
      );
      setOtpSentPhone(fullPhone);
      setLatestCode(resp.code);
      setWhatsappLink(resp.whatsappLink);
      setResendCooldown(60);
      setStep('otp');
      setInfoMessage(`We sent a 6-digit verification code to your WhatsApp: ${fullPhone}`);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Sign In With WhatsApp Number & Password (Standard Login)
  const handleStandardWhatsAppLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const fullPhone = getFullPhoneNumber();
    const digits = cleanPhoneDigits(fullPhone);

    if (digits.length < 7) {
      setError('Please enter your registered WhatsApp phone number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithWhatsApp(fullPhone, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Incorrect WhatsApp number or password. Please verify.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Verify OTP and Complete Registration or Login (Step 2)
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setError(null);
    const code = codeToVerify || otpDigits.join('');

    if (code.length !== 6) {
      setError('Please enter all 6 numbers of the verification code.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithWhatsApp(
          otpSentPhone,
          password,
          managerName.trim(),
          code
        );
      } else {
        // Sign in via WhatsApp OTP code
        await signInWithWhatsAppOtp(otpSentPhone, code);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle individual digit input
  const handleOtpDigitChange = (index: number, val: string) => {
    const char = val.slice(-1).replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto verify when 6th digit filled
    if (char && index === 5 && newDigits.every(d => d !== '')) {
      handleVerifyOtp(newDigits.join(''));
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
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else if (pasted.length > 0) {
      const nextIdx = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const resp = await sendWhatsAppOtpCode(
        otpSentPhone,
        managerName.trim() || undefined,
        mode === 'signup' ? 'signup' : 'signin'
      );
      setLatestCode(resp.code);
      setWhatsappLink(resp.whatsappLink);
      setResendCooldown(60);
      setInfoMessage(`New 6-digit verification code sent to ${otpSentPhone}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Email login fallback handler
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailInput.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(emailInput.trim(), password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with email. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header with WhatsApp Theme */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <MessageCircle className="w-8 h-8 text-emerald-400" />
          </div>
          
          <h1 className="text-2xl font-black text-white tracking-tight">
            {step === 'otp'
              ? 'Verify WhatsApp Code'
              : mode === 'login'
              ? 'Sign In with WhatsApp'
              : 'Sign Up with WhatsApp'}
          </h1>
          
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {step === 'otp'
              ? `Enter the 6-digit verification code sent to your WhatsApp (${otpSentPhone})`
              : mode === 'login'
              ? 'Enter your registered WhatsApp number and password to access your manager dashboard.'
              : 'Register with your WhatsApp number, manager name, and password.'}
          </p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs flex items-start gap-2.5 text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Success / Info Notification Banner */}
        {infoMessage && !error && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs flex items-start gap-2.5 text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-medium">{infoMessage}</span>
          </div>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION SCREEN */}
        {step === 'otp' ? (
          <div className="space-y-6 animate-fade-in">
            
            {/* 6 Digit Input Boxes */}
            <div className="space-y-2">
              <label className="block text-center text-xs font-bold uppercase text-neutral-400 tracking-wider">
                Enter 6-Digit Code
              </label>

              <div className="flex justify-center items-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
                  />
                ))}
              </div>
            </div>

            {/* Direct WhatsApp Message helper (1-click code delivery) */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 text-xs space-y-3">
              <div className="flex items-start gap-2.5 text-emerald-400">
                <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-neutral-200 block">WhatsApp Code Delivery</span>
                  <p className="text-neutral-400 text-[11px] leading-relaxed">
                    Open your WhatsApp app to view the code, or click below to receive it directly in WhatsApp chat:
                  </p>
                </div>
              </div>

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in WhatsApp</span>
                </a>
              )}

              {latestCode && (
                <div className="pt-1 flex items-center justify-between text-[11px] border-t border-neutral-800">
                  <span className="text-neutral-400">Instant verification code:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = latestCode.split('');
                      setOtpDigits(digits);
                      handleVerifyOtp(latestCode);
                    }}
                    className="font-mono font-bold text-emerald-400 hover:text-emerald-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800 hover:border-emerald-500 transition-colors"
                  >
                    {latestCode} (Click to auto-fill)
                  </button>
                </div>
              )}
            </div>

            {/* Submit Verification Button */}
            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={submitting || otpDigits.some((d) => d === '')}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {mode === 'signup' ? 'Verify & Register Account' : 'Verify & Sign In'}
                  </span>
                </>
              )}
            </button>

            {/* Resend and Edit Controls */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Number</span>
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || submitting}
                className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:text-neutral-600 transition-colors"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        ) : showEmailLogin ? (
          /* EMAIL LOGIN FALLBACK */
          <form onSubmit={handleEmailLogin} className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="manager@example.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{submitting ? 'Signing In...' : 'Sign In with Email'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowEmailLogin(false)}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                ← Back to WhatsApp Sign In
              </button>
            </div>
          </form>
        ) : (
          /* STEP 1: WHATSAPP SIGN UP OR SIGN IN FORM */
          <form
            onSubmit={mode === 'signup' ? handleRequestOtp : handleStandardWhatsAppLogin}
            className="space-y-4 animate-fade-in"
          >
            {/* WhatsApp Phone Number Input with Country Code Selector */}
            <div>
              <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                WhatsApp Phone Number
              </label>

              <div className="flex gap-2">
                {/* Country Code Dropdown */}
                <div className="relative w-36 shrink-0">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = POPULAR_COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) setSelectedCountry(found);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-3 text-white text-xs font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all appearance-none cursor-pointer"
                  >
                    {POPULAR_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-neutral-900 text-white">
                        {c.flag} {c.dialCode} ({c.name})
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-xs">
                    ▼
                  </div>
                </div>

                {/* Local Phone Number Input */}
                <div className="relative flex-1">
                  <input
                    type="tel"
                    required
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    placeholder={selectedCountry.placeholder}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1 pl-1">
                Full WhatsApp ID: <span className="text-neutral-300 font-mono font-semibold">{getFullPhoneNumber()}</span>
              </p>
            </div>

            {/* Manager / Gamer Name (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
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
                    placeholder="e.g. PepGamer24 or KingTactician"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    Sign in with WhatsApp code
                  </button>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up only) */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
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
                    placeholder="Repeat your password"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                  />
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : mode === 'signup' ? (
                <>
                  <MessageCircle className="w-4 h-4" />
                  <span>Get 6-Digit WhatsApp Code</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In with WhatsApp</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Mode Switcher */}
        <div className="pt-2 border-t border-neutral-800/80 text-center space-y-2">
          {mode === 'login' ? (
            <p className="text-xs text-neutral-400">
              Don't have a manager account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('form');
                  onSwitchMode('signup');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
              >
                Sign up with WhatsApp
              </button>
            </p>
          ) : (
            <p className="text-xs text-neutral-400">
              Already registered your WhatsApp?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('form');
                  onSwitchMode('login');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
              >
                Sign in with WhatsApp
              </button>
            </p>
          )}

          {/* Fallback link to sign in with email if previously registered */}
          {!showEmailLogin && step !== 'otp' && (
            <div>
              <button
                type="button"
                onClick={() => setShowEmailLogin(true)}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Or sign in with email address
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

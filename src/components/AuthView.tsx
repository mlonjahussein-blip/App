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
  Sparkles,
  KeyRound
} from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
  customAuthMessage?: string | null;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode, customAuthMessage }) => {
  const {
    signIn,
    signUp,
    sendEmailOtpCode,
    sendWhatsAppOtpCode,
    signInWithEmailOtp,
    signInWithWhatsAppOtp,
    resetPasswordWithOtp
  } = useAuth();
  
  const mode = initialMode; // 'login' | 'signup'

  // Login sub-modes: 'password' | 'otp'
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginOtpSent, setLoginOtpSent] = useState(false);

  // Forgot password mode
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetOtpDigits, setResetOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const resetOtpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Form Fields for Sign Up / Login
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

  useEffect(() => {
    if (isForgotPassword && resetStep === 'verify') {
      setTimeout(() => {
        resetOtpRefs.current[0]?.focus();
      }, 150);
    }
  }, [isForgotPassword, resetStep]);

  // Reset errors and step when switching modes
  useEffect(() => {
    setError(null);
    setInfoMessage(null);
    setStep('form');
    setIsForgotPassword(false);
    setResetStep('request');
    setLoginMethod('password');
    setLoginOtpSent(false);
    setOtpDigits(['', '', '', '', '', '']);
    setResetOtpDigits(['', '', '', '', '', '']);
  }, [mode]);

  const getFullWhatsAppNumber = (): string => {
    if (!localPhone.trim()) return '';
    return formatFullWhatsAppNumber(selectedCountry.dialCode, localPhone);
  };

  // --- SUBMIT HANDLERS ---

  // 1. Standard Sign In (Email or WhatsApp Number + Password)
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

  // 2. Request OTP for Passwordless Sign In
  const handleRequestLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const identifier = email.trim();
    if (!identifier) {
      setError('Please enter your email or WhatsApp number.');
      return;
    }

    setSubmitting(true);
    try {
      if (identifier.includes('@')) {
        await sendEmailOtpCode(identifier.toLowerCase());
        setInfoMessage(`A 6-digit login code was sent to ${identifier.toLowerCase()}`);
      } else {
        const rawDigits = cleanPhoneDigits(identifier);
        const cleanPhone = identifier.startsWith('+') ? identifier : '+' + rawDigits;
        await sendWhatsAppOtpCode(cleanPhone, undefined, 'signin');
        setInfoMessage(`A 6-digit login code was sent to WhatsApp ${cleanPhone}`);
      }
      setLoginOtpSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Passwordless Sign In with OTP
  const handleVerifyLoginOtp = async (overrideCode?: string) => {
    setError(null);
    setInfoMessage(null);

    const codeToVerify = (overrideCode || otpDigits.join('')).trim();
    if (codeToVerify.length !== 6) {
      setError('Please enter the 6-digit login code.');
      return;
    }

    const identifier = email.trim();
    setSubmitting(true);
    try {
      if (identifier.includes('@')) {
        await signInWithEmailOtp(identifier.toLowerCase(), codeToVerify);
      } else {
        const rawDigits = cleanPhoneDigits(identifier);
        const cleanPhone = identifier.startsWith('+') ? identifier : '+' + rawDigits;
        await signInWithWhatsAppOtp(cleanPhone, codeToVerify);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid login code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Request 6-Digit Email Verification Code (Sign Up Step 1)
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

  // 4. Complete Registration with 6-Digit Email OTP (Sign Up Step 2)
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

  // 5. Password Reset Flow: Step 1 - Send 6-Digit Code
  const handleRequestResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanId = resetIdentifier.trim();
    if (!cleanId) {
      setError('Please enter your registered email address or WhatsApp phone number.');
      return;
    }

    setSubmitting(true);
    try {
      if (cleanId.includes('@')) {
        await sendEmailOtpCode(cleanId.toLowerCase());
        setInfoMessage(`A 6-digit reset code has been sent to ${cleanId.toLowerCase()}. Check inbox & spam.`);
      } else {
        const rawDigits = cleanPhoneDigits(cleanId);
        const cleanPhone = cleanId.startsWith('+') ? cleanId : '+' + rawDigits;
        await sendWhatsAppOtpCode(cleanPhone, undefined, 'signin');
        setInfoMessage(`A 6-digit reset code has been sent to WhatsApp ${cleanPhone}.`);
      }
      setResetStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code. Please verify your email or phone number.');
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Password Reset Flow: Step 2 - Verify Code and Set New Password
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const code = resetOtpDigits.join('').trim();
    if (code.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordWithOtp(resetIdentifier.trim(), code, newPassword);
      setInfoMessage('Password successfully updated! Signing you in...');
      setTimeout(() => {
        onSuccess();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify the 6-digit code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend 6-Digit Code for Sign Up / OTP Login
  const handleResendCode = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      if (isForgotPassword) {
        if (resetIdentifier.includes('@')) {
          await sendEmailOtpCode(resetIdentifier.trim().toLowerCase());
        } else {
          const rawDigits = cleanPhoneDigits(resetIdentifier);
          const cleanPhone = resetIdentifier.startsWith('+') ? resetIdentifier : '+' + rawDigits;
          await sendWhatsAppOtpCode(cleanPhone, undefined, 'signin');
        }
        setInfoMessage(`New 6-digit code sent to ${resetIdentifier}`);
      } else {
        const cleanEmail = email.trim().toLowerCase();
        await sendEmailOtpCode(cleanEmail, managerName.trim() || undefined);
        setInfoMessage(`New 6-digit verification code sent to ${cleanEmail}`);
      }
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 6-Digit Box Input Navigation for Sign Up / Login OTP
  const handleOtpDigitChange = (index: number, val: string) => {
    const rawVal = val.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (rawVal.length > 1) {
      const pasted = rawVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      if (pasted.length === 6) {
        if (mode === 'login') {
          handleVerifyLoginOtp(pasted.join(''));
        } else {
          handleVerifyAndRegister(pasted.join(''));
        }
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
      if (mode === 'login') {
        handleVerifyLoginOtp(newDigits.join(''));
      } else {
        handleVerifyAndRegister(newDigits.join(''));
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // 6-Digit Box Input Navigation for Reset Password
  const handleResetOtpDigitChange = (index: number, val: string) => {
    const rawVal = val.replace(/[^0-9]/g, '');
    const newDigits = [...resetOtpDigits];

    if (rawVal.length > 1) {
      const pasted = rawVal.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setResetOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      resetOtpRefs.current[nextIdx]?.focus();
      return;
    }

    newDigits[index] = rawVal ? rawVal.slice(-1) : '';
    setResetOtpDigits(newDigits);

    if (rawVal && index < 5) {
      resetOtpRefs.current[index + 1]?.focus();
    }
  };

  const handleResetOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !resetOtpDigits[index] && index > 0) {
      resetOtpRefs.current[index - 1]?.focus();
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
            {isForgotPassword
              ? resetStep === 'verify'
                ? 'Create New Password'
                : 'Reset Password'
              : mode === 'login'
              ? 'Sign In to AI Hub'
              : step === 'otp'
              ? 'Verify Email Code'
              : 'Create Manager Account'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            {isForgotPassword
              ? resetStep === 'verify'
                ? 'Enter the 6-digit code sent to your email/phone and choose your new password.'
                : 'Enter your email or WhatsApp number to receive a 6-digit reset code.'
              : mode === 'login'
              ? 'Access your squad builder, AI tactical reports & saved formations on any device.'
              : step === 'otp'
              ? `Enter the 6-digit code sent to ${email}`
              : 'Sign up with email, password & link your WhatsApp number.'}
          </p>
        </div>

        {/* Custom Auth Message for Navigation / Protected Actions */}
        {customAuthMessage && !error && !infoMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1 leading-relaxed font-medium">{customAuthMessage}</div>
          </div>
        )}

        {/* Feedback Notifications */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col gap-2 text-xs text-red-400 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>

            {/* Quick action button for incorrect password */}
            {error.toLowerCase().includes('password') && !isForgotPassword && (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setResetStep('request');
                  setResetIdentifier(email.trim());
                  setError(null);
                  setInfoMessage(null);
                }}
                className="mt-1 self-start px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Password with 6-Digit Code</span>
              </button>
            )}
          </div>
        )}

        {infoMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-400 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{infoMessage}</div>
          </div>
        )}

        {/* --- FORGOT PASSWORD FLOW --- */}
        {isForgotPassword && (
          <div className="space-y-4">
            {resetStep === 'request' ? (
              <form onSubmit={handleRequestResetOtp} className="space-y-4 relative">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Registered Email or WhatsApp Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="e.g. mlonjahussein@gmail.com"
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
                      <span>Sending 6-Digit Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send 6-Digit Reset Code</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                      setInfoMessage(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-white transition-colors font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4 relative">
                {/* Identifier Banner */}
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex justify-between items-center">
                  <span className="text-neutral-400">Account:</span>
                  <span className="font-bold text-emerald-400">{resetIdentifier}</span>
                </div>

                {/* 6-Digit Code Entry */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider text-center mb-2.5">
                    Enter 6-Digit Reset Code
                  </label>
                  <div className="flex items-center justify-center gap-2">
                    {resetOtpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          resetOtpRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleResetOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleResetOtpKeyDown(idx, e)}
                        className="w-11 h-12 text-center text-xl font-black bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
                      />
                    ))}
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    New Password (Min. 6 characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                {/* Confirm New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || resetOtpDigits.some((d) => d === '')}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Reset Password & Sign In</span>
                    </>
                  )}
                </button>

                <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                  <button
                    type="button"
                    onClick={() => setResetStep('request')}
                    className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0 || submitting}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- SIGN IN FORMS (PASSWORD OR OTP) --- */}
        {mode === 'login' && !isForgotPassword && (
          <div className="space-y-4">
            {/* Login Method Toggle */}
            <div className="flex p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center ${
                  loginMethod === 'password'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('otp');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                  loginMethod === 'otp'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>6-Digit Code Login</span>
              </button>
            </div>

            {loginMethod === 'password' ? (
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setResetStep('request');
                        setResetIdentifier(email.trim());
                        setError(null);
                        setInfoMessage(null);
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
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
            ) : (
              <div className="space-y-4">
                {!loginOtpSent ? (
                  <form onSubmit={handleRequestLoginOtp} className="space-y-4">
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

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sending 6-Digit Code...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Send 6-Digit Login Code</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex justify-between items-center">
                      <span className="text-neutral-400">Sending Code To:</span>
                      <span className="font-bold text-emerald-400">{email}</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wider text-center mb-2.5">
                        Enter 6-Digit Login Code
                      </label>
                      <div className="flex items-center justify-center gap-2">
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
                            className="w-11 h-12 text-center text-xl font-black bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleVerifyLoginOtp()}
                      disabled={submitting || otpDigits.some((d) => d === '')}
                      className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Verifying & Logging In...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify & Sign In</span>
                        </>
                      )}
                    </button>

                    <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                      <button
                        type="button"
                        onClick={() => setLoginOtpSent(false)}
                        className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Edit Email/Phone</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRequestLoginOtp}
                        disabled={resendCooldown > 0 || submitting}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
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
                Linked to your tactical account for WhatsApp support and direct manager login across all devices.
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

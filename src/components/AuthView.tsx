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
  ExternalLink,
  MessageCircle,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  initialMode: 'login' | 'signup';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'signup') => void;
}

export const AuthView: React.FC<AuthModalProps> = ({ initialMode, onSuccess, onSwitchMode }) => {
  const {
    signIn,
    signUp,
    signInWithWhatsApp,
    signUpWithWhatsApp,
    sendWhatsAppOtpCode,
    sendEmailOtpCode,
    signInWithWhatsAppOtp
  } = useAuth();

  const mode = initialMode; // 'login' | 'signup'

  // Selected Auth Method: 'email' (Option 2) or 'whatsapp' (Option 1)
  const [authMethod, setAuthMethod] = useState<'whatsapp' | 'email'>('whatsapp');

  // Option 1: WhatsApp States
  const [selectedCountry, setSelectedCountry] = useState<CountryCodeItem>(POPULAR_COUNTRIES[0]); // Tanzania (+255)
  const [localPhone, setLocalPhone] = useState('');
  const [waManagerName, setWaManagerName] = useState('');
  const [waPassword, setWaPassword] = useState('');
  const [waConfirmPassword, setWaConfirmPassword] = useState('');
  const [showWaPassword, setShowWaPassword] = useState(false);
  
  // WhatsApp OTP Verification Step
  const [waStep, setWaStep] = useState<'form' | 'otp'>('form');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpSentPhone, setOtpSentPhone] = useState<string>('');
  const [whatsappLink, setWhatsappLink] = useState<string>('');
  const [hasGateway, setHasGateway] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Option 2: Email & Password States (Salted SHA-256)
  const [email, setEmail] = useState('');
  const [emailManagerName, setEmailManagerName] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Email OTP Verification Step
  const [emailStep, setEmailStep] = useState<'form' | 'otp'>('form');
  const [emailOtpDigits, setEmailOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [emailOtpSentTo, setEmailOtpSentTo] = useState<string>('');
  const [emailResendCooldown, setEmailResendCooldown] = useState<number>(0);
  const emailOtpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Status & Notifications
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Timer countdown for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Timer countdown for email resend
  useEffect(() => {
    if (emailResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setEmailResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [emailResendCooldown]);

  // Focus first OTP box when entering WhatsApp OTP step
  useEffect(() => {
    if (waStep === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [waStep]);

  // Focus first OTP box when entering Email OTP step
  useEffect(() => {
    if (emailStep === 'otp') {
      setTimeout(() => {
        emailOtpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [emailStep]);

  const getFullWhatsAppNumber = (): string => {
    return formatFullWhatsAppNumber(selectedCountry.dialCode, localPhone);
  };

  // Direct WhatsApp Sign Up & Login with Password
  const handleWhatsAppSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const fullPhone = getFullWhatsAppNumber();
    const digits = cleanPhoneDigits(fullPhone);

    if (digits.length < 7) {
      setError('Please enter a valid WhatsApp phone number.');
      return;
    }

    if (!waPassword) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!waManagerName.trim()) {
        setError('Please enter your Manager / Gamer name (e.g. PepGamer24).');
        return;
      }
      if (waPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (waPassword !== waConfirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }
    }

    if (mode === 'signup') {
      // In sign up, require 6-digit WhatsApp verification code
      return handleRequestWhatsAppOtp(e);
    }

    setSubmitting(true);
    try {
      await signInWithWhatsApp(fullPhone, waPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Optional 6-digit WhatsApp OTP verification flow (if requested)
  const handleRequestWhatsAppOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const fullPhone = getFullWhatsAppNumber();
    const digits = cleanPhoneDigits(fullPhone);

    if (digits.length < 7) {
      setError('Please enter a valid WhatsApp phone number.');
      return;
    }

    if (mode === 'signup') {
      if (!waManagerName.trim()) {
        setError('Please enter your Manager / Gamer name (e.g. PepGamer24).');
        return;
      }
      if (!waPassword || waPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (waPassword !== waConfirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const resp = await sendWhatsAppOtpCode(
        fullPhone,
        waManagerName.trim() || undefined,
        mode === 'signup' ? 'signup' : 'signin'
      );
      setOtpSentPhone(fullPhone);
      setWhatsappLink(resp.whatsappLink);
      setHasGateway(!!resp.hasGateway);
      setResendCooldown(60);
      setWaStep('otp');

      setInfoMessage(
        resp.message || `We sent a 6-digit verification code to your WhatsApp: ${fullPhone}`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch WhatsApp verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Standard WhatsApp Login with Password
  const handleWhatsAppPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const fullPhone = getFullWhatsAppNumber();
    const digits = cleanPhoneDigits(fullPhone);

    if (digits.length < 7) {
      setError('Please enter your registered WhatsApp phone number.');
      return;
    }
    if (!waPassword) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await signInWithWhatsApp(fullPhone, waPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Incorrect WhatsApp number or password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify WhatsApp 6-digit OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    setError(null);
    const code = codeToVerify || otpDigits.join('');

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUpWithWhatsApp(
          otpSentPhone,
          waPassword,
          waManagerName.trim(),
          code
        );
      } else {
        await signInWithWhatsAppOtp(otpSentPhone, code);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpDigitChange = (index: number, val: string) => {
    const char = val.slice(-1).replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);

    if (char && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (char && index === 5 && newDigits.every((d) => d !== '')) {
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
        waManagerName.trim() || undefined,
        mode === 'signup' ? 'signup' : 'signin'
      );
      setWhatsappLink(resp.whatsappLink);
      setHasGateway(!!resp.hasGateway);
      setResendCooldown(60);

      // Attempt to open WhatsApp directly with new code
      if (typeof window !== 'undefined' && resp.whatsappLink) {
        try {
          window.open(resp.whatsappLink, '_blank');
        } catch (e) {}
      }

      setInfoMessage(`New 6-digit verification code dispatched for ${otpSentPhone}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- EMAIL & PASSWORD FLOW HANDLERS (OPTION 2: SALTED SHA-256) ---
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!emailPassword) {
      setError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (!emailManagerName.trim()) {
        setError('Please enter your Manager / Gamer name.');
        return;
      }
      if (emailPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (emailPassword !== emailConfirmPassword) {
        setError('Passwords do not match. Please verify.');
        return;
      }

      setSubmitting(true);
      try {
        const resp = await sendEmailOtpCode(cleanEmail, emailManagerName.trim());
        setEmailOtpSentTo(cleanEmail);
        setEmailResendCooldown(60);
        setEmailStep('otp');
        setInfoMessage(`We sent a 6-digit verification code from info@efootballaihub.com to ${cleanEmail}`);
      } catch (err: any) {
        setError(err.message || 'Failed to dispatch email verification code. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Login mode directly verifies password
    setSubmitting(true);
    try {
      await signIn(cleanEmail, emailPassword);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // Verify Email 6-digit OTP
  const handleVerifyEmailOtp = async (codeToVerify?: string) => {
    setError(null);
    const code = codeToVerify || emailOtpDigits.join('');

    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(emailOtpSentTo, emailPassword, emailManagerName.trim(), code);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Invalid or expired 6-digit verification code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailOtpDigitChange = (index: number, val: string) => {
    const char = val.slice(-1).replace(/[^0-9]/g, '');
    const newDigits = [...emailOtpDigits];
    newDigits[index] = char;
    setEmailOtpDigits(newDigits);

    if (char && index < 5) {
      emailOtpInputRefs.current[index + 1]?.focus();
    }

    if (char && index === 5 && newDigits.every((d) => d !== '')) {
      handleVerifyEmailOtp(newDigits.join(''));
    }
  };

  const handleEmailOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !emailOtpDigits[index] && index > 0) {
      emailOtpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleEmailOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...emailOtpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setEmailOtpDigits(newDigits);

    if (pasted.length === 6) {
      handleVerifyEmailOtp(pasted);
    } else if (pasted.length > 0) {
      const nextIdx = Math.min(pasted.length, 5);
      emailOtpInputRefs.current[nextIdx]?.focus();
    }
  };

  const handleResendEmailOtp = async () => {
    if (emailResendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await sendEmailOtpCode(emailOtpSentTo, emailManagerName.trim() || undefined);
      setEmailResendCooldown(60);
      setInfoMessage(`New 6-digit verification code sent from info@efootballaihub.com to ${emailOtpSentTo}`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            {authMethod === 'whatsapp' ? (
              <MessageCircle className="w-6 h-6 text-emerald-400" />
            ) : (
              <Mail className="w-6 h-6 text-emerald-400" />
            )}
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">
            {waStep === 'otp' && authMethod === 'whatsapp'
              ? 'Verify WhatsApp Code'
              : emailStep === 'otp' && authMethod === 'email'
              ? 'Verify Email Code'
              : mode === 'login'
              ? 'Sign In to AI Hub'
              : 'Create Manager Account'}
          </h1>

          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {waStep === 'otp' && authMethod === 'whatsapp'
              ? `Enter the 6-digit verification code sent to your WhatsApp (${otpSentPhone})`
              : emailStep === 'otp' && authMethod === 'email'
              ? `Enter the 6-digit verification code sent from info@efootballaihub.com to ${emailOtpSentTo}`
              : mode === 'login'
              ? 'Choose your preferred sign-in method to access squad analysis & tactics.'
              : 'Choose Option 1 (WhatsApp) or Option 2 (Email & Password) to sign up with 6-digit verification.'}
          </p>
        </div>

        {/* Method Selector Tabs: Option 1 (WhatsApp) & Option 2 (Email & Password) */}
        {waStep !== 'otp' && emailStep !== 'otp' && (
          <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfoMessage(null);
                setAuthMethod('whatsapp');
              }}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                authMethod === 'whatsapp'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>1. WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setInfoMessage(null);
                setAuthMethod('email');
              }}
              className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                authMethod === 'email'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20 font-black'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>2. Email & Password</span>
            </button>
          </div>
        )}

        {/* Error Alert Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs flex items-start gap-2.5 text-rose-300 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Info / Success Alert Banner */}
        {infoMessage && !error && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs flex items-start gap-2.5 text-emerald-300 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-medium">{infoMessage}</span>
          </div>
        )}

        {/* --- OPTION 1: WHATSAPP AUTHENTICATION --- */}
        {authMethod === 'whatsapp' && (
          <>
            {waStep === 'otp' ? (
              /* WhatsApp Step 2: 6-Digit Verification Code Screen */
              <div className="space-y-5 animate-fade-in">
                
                {/* 6 Digit Numeric Boxes */}
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

                {/* Direct WhatsApp Open Link & Verification Assistant */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 text-xs space-y-3">
                  <div className="flex items-start gap-2.5 text-emerald-400">
                    <MessageCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                    <div className="space-y-1">
                      <span className="font-bold text-neutral-200 block text-xs">WhatsApp Verification Ready</span>
                      <p className="text-neutral-400 text-[11px] leading-relaxed">
                        To receive or view your 6-digit code on <strong className="text-white">{otpSentPhone}</strong>, tap the button below to open WhatsApp:
                      </p>
                    </div>
                  </div>

                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Open WhatsApp to Receive 6-Digit Code</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
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

                {/* Resend and Change Number */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setWaStep('form');
                    }}
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
            ) : (
              /* WhatsApp Step 1: Phone & Details Form */
              <form
                onSubmit={handleWhatsAppSubmit}
                className="space-y-4 animate-fade-in"
              >
                {/* Phone Number Input */}
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                    WhatsApp Phone Number
                  </label>

                  <div className="flex gap-2">
                    {/* Country Code Picker with Instant Search & Narrow Down */}
                    <CountryCodeSelector
                      selectedCountry={selectedCountry}
                      onSelectCountry={(c) => setSelectedCountry(c)}
                    />

                    {/* Local Phone Input */}
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
                    Full WhatsApp Number:{' '}
                    <span className="text-neutral-300 font-mono font-semibold">
                      {getFullWhatsAppNumber()}
                    </span>
                  </p>
                </div>

                {/* Manager Name (Sign Up only) */}
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
                        value={waManagerName}
                        onChange={(e) => setWaManagerName(e.target.value)}
                        placeholder="e.g. PepGamer24"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={handleRequestWhatsAppOtp}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        Sign in with 6-digit code
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showWaPassword ? 'text' : 'password'}
                      required
                      value={waPassword}
                      onChange={(e) => setWaPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWaPassword(!showWaPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300"
                    >
                      {showWaPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        type={showWaPassword ? 'text' : 'password'}
                        required
                        value={waConfirmPassword}
                        onChange={(e) => setWaConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Action */}
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
                      <span>Send 6-Digit WhatsApp Code</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign In with WhatsApp</span>
                    </>
                  )}
                </button>

                {mode === 'signup' ? (
                  <p className="text-[11px] text-center text-neutral-400 flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security Step 1: 6-digit verification code will be sent to your WhatsApp</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-center text-neutral-500 flex items-center justify-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Instant Account Activation & Salted SHA-256 Security</span>
                  </p>
                )}
              </form>
            )}
          </>
        )}

        {/* --- OPTION 2: STANDARD EMAIL & PASSWORD WITH 6-DIGIT VERIFICATION (FROM info@efootballaihub.com) --- */}
        {authMethod === 'email' && (
          <>
            {emailStep === 'form' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4 animate-fade-in">
                {/* Manager Name (Sign Up only) */}
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
                        value={emailManagerName}
                        onChange={(e) => setEmailManagerName(e.target.value)}
                        placeholder="e.g. PepGamer24"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                    Email Address
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
                      placeholder="manager@example.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold uppercase text-neutral-400 tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showEmailPassword ? 'text' : 'password'}
                      required
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300"
                    >
                      {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                        type={showEmailPassword ? 'text' : 'password'}
                        required
                        value={emailConfirmPassword}
                        onChange={(e) => setEmailConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-neutral-600"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Email Action */}
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
                      <Mail className="w-4 h-4" />
                      <span>Send 6-Digit Verification Code</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Sign In with Email</span>
                    </>
                  )}
                </button>

                {mode === 'signup' ? (
                  <p className="text-[11px] text-center text-neutral-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security Step 1: Verification email will be sent from info@efootballaihub.com</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-center text-neutral-500 flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protected by Salted SHA-256 Web Crypto Hashing</span>
                  </p>
                )}
              </form>
            ) : (
              /* --- EMAIL STEP 2: 6-DIGIT VERIFICATION CODE INPUT --- */
              <div className="space-y-5 animate-fade-in">
                {/* 6-Digit Numeric Boxes */}
                <div className="space-y-2">
                  <label className="block text-center text-xs font-bold uppercase text-neutral-400 tracking-wider">
                    Enter 6-Digit Verification Code
                  </label>

                  <div className="flex justify-center items-center gap-2 sm:gap-2.5" onPaste={handleEmailOtpPaste}>
                    {emailOtpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (emailOtpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleEmailOtpDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleEmailOtpKeyDown(idx, e)}
                        className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl text-white outline-none transition-all shadow-inner focus:ring-2 focus:ring-emerald-500/20"
                      />
                    ))}
                  </div>
                </div>

                {/* Email Dispatch Info Card */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-emerald-500/30 text-xs space-y-3">
                  <div className="flex items-start gap-2.5 text-emerald-400">
                    <Mail className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-200 block text-xs">Verification Email Dispatched</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                          info@efootballaihub.com
                        </span>
                      </div>
                      <p className="text-neutral-400 text-[11px] leading-relaxed">
                        A 6-digit code was sent to <strong className="text-white">{emailOtpSentTo}</strong> from <strong className="text-emerald-400">info@efootballaihub.com</strong>. Check your inbox and spam folder.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Email Verification Button */}
                <button
                  type="button"
                  onClick={() => handleVerifyEmailOtp()}
                  disabled={submitting || emailOtpDigits.some((d) => d === '')}
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
                      <span>Verify & Create Account</span>
                    </>
                  )}
                </button>

                {/* Resend and Change Email */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setInfoMessage(null);
                      setEmailStep('form');
                    }}
                    className="text-neutral-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendEmailOtp}
                    disabled={emailResendCooldown > 0 || submitting}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold disabled:text-neutral-600 transition-colors"
                  >
                    {emailResendCooldown > 0 ? `Resend in ${emailResendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer: Toggle Login vs Sign Up */}
        <div className="pt-2 border-t border-neutral-800 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-neutral-400">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfoMessage(null);
                  setWaStep('form');
                  setEmailStep('form');
                  onSwitchMode('signup');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p className="text-xs text-neutral-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfoMessage(null);
                  setWaStep('form');
                  setEmailStep('form');
                  onSwitchMode('login');
                }}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

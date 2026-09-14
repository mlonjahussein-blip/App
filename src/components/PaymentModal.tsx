import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  ExternalLink,
  Lock,
  Smartphone,
  Check,
  ArrowRight,
  ChevronRight,
  Info
} from 'lucide-react';
import { UserEntitlements, PaymentRecord } from '../types.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail?: string;
  displayName?: string;
  entitlements: UserEntitlements | null;
  onPaymentSuccess: (grantedRecord?: PaymentRecord) => void;
  onRefreshEntitlements?: () => void;
}

type PaymentOption = 'card' | 'mobile_money';

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail = '',
  displayName = '',
  entitlements,
  onPaymentSuccess,
  onRefreshEntitlements
}) => {
  const [step, setStep] = useState<'form' | 'awaiting_payment' | 'success' | 'failed'>('form');
  const [selectedOption, setSelectedOption] = useState<PaymentOption>('card');

  // Form State
  const [fullName, setFullName] = useState<string>(displayName || '');
  const [email, setEmail] = useState<string>(userEmail || '');
  const [phone, setPhone] = useState<string>('');
  const [countryCode, setCountryCode] = useState<string>('KE');

  // Card Inputs
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');

  // Mobile Money Inputs
  const [mobileProvider, setMobileProvider] = useState<string>('mpesa_ke');

  // Processing & Polling State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [providerTxId, setProviderTxId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [lastPaymentRecord, setLastPaymentRecord] = useState<PaymentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial props
  useEffect(() => {
    if (displayName && !fullName) setFullName(displayName);
    if (userEmail && !email) setEmail(userEmail);
  }, [displayName, userEmail]);

  // Clean up polling interval on unmount or reset
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const priceDisplay = entitlements?.priceDisplay || '$2.00 USD';

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Card Expiry (MM/YY)
  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Format CVV (3 or 4 digits)
  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvv(raw);
  };

  // Submit Order to Pesapal
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusNotice(null);

    // Form Validations
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, '').length < 8) {
      setErrorMessage('Please enter a valid phone number (at least 8 digits).');
      return;
    }

    if (selectedOption === 'card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 15) {
        setErrorMessage('Please enter a valid 16-digit card number.');
        return;
      }
      if (cardExpiry.length < 5) {
        setErrorMessage('Please enter a valid expiration date (MM/YY).');
        return;
      }
      if (cardCvv.length < 3) {
        setErrorMessage('Please enter a valid CVV/CVC code (3 or 4 digits).');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const resp = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider: 'pesapal',
          userEmail: email.trim(),
          displayName: fullName.trim(),
          phoneNumber: phone.trim(),
          countryCode
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to initialize Pesapal payment order.');
      }

      const data = await resp.json();
      const order = data.order;

      if (!order || !order.paymentId) {
        throw new Error('Invalid order response from payment gateway.');
      }

      setActivePaymentId(order.paymentId);
      setProviderTxId(order.providerTransactionId);

      // Open Pesapal Checkout
      if (order.checkoutUrl) {
        setCheckoutUrl(order.checkoutUrl);
        // Attempt to open in a secure new window as well
        window.open(order.checkoutUrl, '_blank', 'noopener,noreferrer');
      }

      setStep('awaiting_payment');
      startPollingPaymentStatus(order.paymentId, order.providerTransactionId);
    } catch (err: any) {
      console.error('Pesapal order creation error:', err);
      setErrorMessage(err.message || 'Could not connect to Pesapal gateway. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll Pesapal Transaction Status
  const startPollingPaymentStatus = (paymentId: string, transactionId?: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let attempts = 0;
    const maxAttempts = 45; // Poll for 3 minutes (every 4 seconds)

    pollTimerRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        return;
      }

      try {
        const verifyResp = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId,
            providerTransactionId: transactionId
          })
        });

        if (verifyResp.ok) {
          const verifyData = await verifyResp.json();
          const result = verifyData?.result;

          if (result?.status === 'SUCCESS' && result?.creditGranted) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            handleSuccess(paymentId, result, transactionId);
          } else if (result?.status === 'FAILED') {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            setErrorMessage(result?.failureReason || 'Transaction was declined on Pesapal.');
            setStep('failed');
          }
        }
      } catch (e) {
        console.warn('Status poll warning:', e);
      }
    }, 4000);
  };

  // Manual Check Verification Button
  const handleVerifyNow = async () => {
    if (!activePaymentId) return;
    setIsCheckingStatus(true);
    setErrorMessage(null);
    setStatusNotice(null);

    try {
      const verifyResp = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: activePaymentId,
          providerTransactionId: providerTxId || undefined
        })
      });

      const verifyData = await verifyResp.json();
      const result = verifyData?.result;

      if (result?.status === 'SUCCESS' && result?.creditGranted) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        handleSuccess(activePaymentId, result, providerTxId || undefined);
      } else if (result?.status === 'FAILED') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setErrorMessage(result?.failureReason || 'Pesapal transaction failed or was declined.');
        setStep('failed');
      } else {
        setStatusNotice('Payment is still pending on Pesapal. Please complete the card OTP or Mobile Money PIN on your phone, then click Check Verification Status again.');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setErrorMessage(err.message || 'Could not verify payment status.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleSuccess = (paymentId: string, result: any, transactionId?: string) => {
    const record: PaymentRecord = {
      id: paymentId,
      userId,
      provider: 'pesapal',
      providerTransactionId: result.providerTransactionId || transactionId || 'PESAPAL-CONFIRMED',
      productType: 'single_analysis',
      amount: result.amount ?? 2.00,
      currency: result.currency || 'USD',
      status: 'SUCCESS',
      creditAmount: 1,
      creditGranted: true,
      isTestMode: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setLastPaymentRecord(record);
    setStep('success');
    onPaymentSuccess(record);
    if (onRefreshEntitlements) {
      onRefreshEntitlements();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Balance Status Header */}
        <div className="flex items-center justify-between bg-neutral-950/80 border border-neutral-800 rounded-2xl px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-neutral-300">
              Free: <span className="text-emerald-400">{entitlements?.freeAnalysesRemaining ?? 1}</span>
            </span>
            <span className="text-neutral-600">•</span>
            <span className="font-bold text-neutral-300">
              Paid Credits: <span className="text-cyan-400">{entitlements?.paidAnalysisCredits ?? 0}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
              Pesapal Live
            </span>
          </div>
        </div>

        {/* STEP 1: ENTER PAYMENT DETAILS FORM */}
        {step === 'form' && (
          <form onSubmit={handleSubmitPayment} className="space-y-4">
            
            {/* Header & Pricing */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3 h-3" />
                <span>eFootball AI Hub Analysis Credit</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Buy Analysis Credit
              </h2>
              <p className="text-xs text-neutral-400">
                Processed directly by Pesapal into your merchant account.
              </p>
            </div>

            {/* Price Card */}
            <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Amount Due
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  {priceDisplay}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  1 Permanent Squad Analysis Credit (Never expires)
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                +1 Credit
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-300 block">
                Choose Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOption('card')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedOption === 'card'
                      ? 'bg-neutral-800/90 border-emerald-500 text-white shadow-md'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <CreditCard className={`w-4 h-4 ${selectedOption === 'card' ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    {selectedOption === 'card' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <span className="text-xs font-bold block text-white">Debit & Credit Card</span>
                  <span className="text-[10px] text-neutral-400">Visa, Mastercard, Amex</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOption('mobile_money')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedOption === 'mobile_money'
                      ? 'bg-neutral-800/90 border-emerald-500 text-white shadow-md'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className={`w-4 h-4 ${selectedOption === 'mobile_money' ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    {selectedOption === 'mobile_money' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <span className="text-xs font-bold block text-white">Mobile Money</span>
                  <span className="text-[10px] text-neutral-400">M-Pesa, Airtel, MTN MoMo</span>
                </button>
              </div>
            </div>

            {/* Customer Contact Details Required by Pesapal */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                Customer Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Hussein Mlonja"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Country *
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="KE">🇰🇪 Kenya (+254)</option>
                    <option value="TZ">🇹🇿 Tanzania (+255)</option>
                    <option value="UG">🇺🇬 Uganda (+256)</option>
                    <option value="RW">🇷🇼 Rwanda (+250)</option>
                    <option value="US">🇺🇸 United States (+1)</option>
                    <option value="GB">🇬🇧 United Kingdom (+44)</option>
                    <option value="ZA">🇿🇦 South Africa (+27)</option>
                    <option value="NG">🇳🇬 Nigeria (+234)</option>
                    <option value="OTHER">🌍 Other Country</option>
                  </select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Phone Number (for SMS OTP / PIN prompt) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0712 345 678"
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* OPTION A: CARD PAYMENT INPUTS */}
            {selectedOption === 'card' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    Card Details
                  </span>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" /> 256-Bit SSL
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Card Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none tracking-wider"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-neutral-500 font-bold">
                      💳 VISA / MC
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 block">
                      Expiry Date *
                    </label>
                    <input
                      type="text"
                      required
                      value={cardExpiry}
                      onChange={handleCardExpiryChange}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none tracking-wider text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 block">
                      CVV / CVC *
                    </label>
                    <input
                      type="password"
                      required
                      value={cardCvv}
                      onChange={handleCardCvvChange}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none tracking-widest text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* OPTION B: MOBILE MONEY INPUTS */}
            {selectedOption === 'mobile_money' && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3 animate-fade-in">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  Mobile Money Network
                </span>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Select Network Provider *
                  </label>
                  <select
                    value={mobileProvider}
                    onChange={(e) => setMobileProvider(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="mpesa_ke">Safaricom M-Pesa (Kenya 🇰🇪)</option>
                    <option value="mpesa_tz">Vodacom M-Pesa (Tanzania 🇹🇿)</option>
                    <option value="airtel_ke">Airtel Money (Kenya 🇰🇪)</option>
                    <option value="airtel_tz">Airtel Money (Tanzania 🇹🇿)</option>
                    <option value="tigo_tz">Tigo Pesa (Tanzania 🇹🇿)</option>
                    <option value="mtn_ug">MTN MoMo (Uganda 🇺🇬)</option>
                    <option value="mtn_rw">MTN MoMo (Rwanda 🇷🇼)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    When you click pay, an official instant STK push prompt will be sent by Pesapal to your phone (<strong>{phone || 'your phone number'}</strong>) to confirm with your PIN.
                  </span>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting to Pesapal...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {priceDisplay} with Pesapal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Pesapal v3 Secure Merchant Gateway</span>
            </div>
          </form>
        )}

        {/* STEP 2: AWAITING PAYMENT (PESAPAL CHECKOUT & VERIFICATION) */}
        {step === 'awaiting_payment' && (
          <div className="py-2 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-xl font-black text-white">Pesapal Processing Order</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Please complete your transaction on the Pesapal portal or on your mobile device.
              </p>
            </div>

            {/* Order Tracking Box */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Amount Due</span>
                <span className="text-emerald-400 font-bold">{priceDisplay}</span>
              </div>
              {providerTxId && (
                <div className="flex justify-between text-neutral-400">
                  <span>Pesapal Tracking Ref</span>
                  <span className="font-mono text-neutral-300 text-[11px]">{providerTxId}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400 border-t border-neutral-900 pt-2">
                <span>Status</span>
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Awaiting Payment Confirmation
                </span>
              </div>
            </div>

            {/* Embedded Pesapal Iframe if available */}
            {checkoutUrl && (
              <div className="space-y-2">
                <div className="w-full h-80 rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-inner">
                  <iframe
                    src={checkoutUrl}
                    title="Pesapal Checkout"
                    className="w-full h-full border-0"
                    allow="payment"
                  />
                </div>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-neutral-700"
                >
                  <span>Open Pesapal in New Window</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Notice / Messages */}
            {statusNotice && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2 animate-fade-in">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Verification Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={handleVerifyNow}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Checking Status with Pesapal...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>I Have Completed Payment — Verify Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                  setStep('form');
                }}
                className="w-full py-2 text-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel & Edit Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Payment Received!</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+1 AI Squad Analysis Credit Assigned</span>
              </div>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto pt-1">
                Your transaction has been verified with Pesapal and your analysis credit has been added to your account.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between text-neutral-400">
                <span>Payment Gateway</span>
                <span className="text-white font-semibold">Pesapal</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Pesapal Tracking ID</span>
                <span className="font-mono text-[11px] text-emerald-400">
                  {lastPaymentRecord?.providerTransactionId || providerTxId || 'PESAPAL-CONFIRMED'}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Amount Paid</span>
                <span className="text-white font-bold">{priceDisplay}</span>
              </div>
              <div className="flex justify-between text-neutral-400 border-t border-neutral-900 pt-2">
                <span>Account Credit Balance</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Credited & Active
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Continue & Analyze Squad</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FAILED */}
        {step === 'failed' && (
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Payment Unsuccessful</h3>
              <p className="text-xs text-rose-300 max-w-sm mx-auto">
                {errorMessage || 'The transaction could not be completed on Pesapal.'}
              </p>
              <p className="text-[11px] text-neutral-500">
                No credit was deducted. You can try again at any time.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

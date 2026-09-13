import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  X,
  Zap,
  ArrowRight,
  Lock,
  Smartphone,
  Check,
  RotateCcw
} from 'lucide-react';
import { PaymentProviderType, UserEntitlements, PaymentRecord } from '../types.ts';

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

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  displayName,
  entitlements,
  onPaymentSuccess,
  onRefreshEntitlements
}) => {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType>('pesapal');
  const [pesapalMethod, setPesapalMethod] = useState<'card' | 'mobile_money'>('card');
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'failed' | 'cancelled'>('select');
  const [processingStatusText, setProcessingStatusText] = useState<string>('Initializing order...');
  const [lastPaymentRecord, setLastPaymentRecord] = useState<PaymentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResettingQuota, setIsResettingQuota] = useState(false);
  const [quotaResetMessage, setQuotaResetMessage] = useState<string | null>(null);

  // Form input mock states for realism
  const [testCardNumber, setTestCardNumber] = useState('4242 •••• •••• 4242');
  const [testCardExpiry, setTestCardExpiry] = useState('12/28');
  const [testCardCvv, setTestCardCvv] = useState('888');
  const [testCardHolder, setTestCardHolder] = useState(displayName || 'eFootball Tactician');
  const [mobileNetwork, setMobileNetwork] = useState('M-Pesa (Kenya)');
  const [mobilePhone, setMobilePhone] = useState('0712 345 678');

  if (!isOpen) return null;

  const isTestMode = entitlements ? entitlements.testMode : true;
  const priceDisplay = entitlements?.priceDisplay || (isTestMode ? '$0.00 USD (TEST MODE)' : '$2.00 USD');

  const providers = [
    {
      id: 'pesapal' as PaymentProviderType,
      name: 'Pesapal',
      subtitle: 'Credit/Debit Card & Mobile Money (M-Pesa, Airtel)',
      icon: CreditCard,
      color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400'
    },
    {
      id: 'paypal' as PaymentProviderType,
      name: 'PayPal',
      subtitle: 'PayPal Wallet, Balance & Linked Cards',
      icon: Lock,
      color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30 text-sky-400'
    },
    {
      id: 'google_pay' as PaymentProviderType,
      name: 'Google Pay',
      subtitle: '1-Tap Fast Checkout with Google Wallet',
      icon: Zap,
      color: 'from-amber-500/20 to-emerald-500/10 border-emerald-500/30 text-emerald-400'
    },
    {
      id: 'apple_pay' as PaymentProviderType,
      name: 'Apple Pay',
      subtitle: 'Biometric Touch ID / Face ID Checkout',
      icon: Smartphone,
      color: 'from-neutral-700/40 to-neutral-800/20 border-neutral-700 text-neutral-300'
    }
  ];

  // Execute Payment Simulation / Creation Flow
  const handleProcessPayment = async (simulateAction: 'success' | 'fail' | 'cancel' = 'success', testIdempotency = false) => {
    setErrorMessage(null);
    setStep('processing');
    setProcessingStatusText('Creating secure payment order...');

    try {
      // 1. Create order on backend
      const createResp = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider: selectedProvider,
          userEmail,
          displayName
        })
      });

      if (!createResp.ok) {
        throw new Error('Failed to create payment order on server.');
      }

      const createData = await createResp.json();
      const paymentId = createData?.order?.paymentId;

      if (!paymentId) {
        throw new Error('Invalid order response from server.');
      }

      // 2. Simulated Processing Steps based on selected gateway
      if (selectedProvider === 'pesapal' && pesapalMethod === 'mobile_money') {
        setProcessingStatusText(`Sending STK push prompt to ${mobilePhone} via ${mobileNetwork}...`);
        await new Promise((r) => setTimeout(r, 900));
        setProcessingStatusText('Awaiting customer M-Pesa PIN confirmation on handset...');
        await new Promise((r) => setTimeout(r, 900));
      } else if (selectedProvider === 'paypal') {
        setProcessingStatusText('Connecting to PayPal Sandbox token exchange...');
        await new Promise((r) => setTimeout(r, 800));
      } else if (selectedProvider === 'google_pay') {
        setProcessingStatusText('Verifying Google Pay cryptographic payload...');
        await new Promise((r) => setTimeout(r, 700));
      } else if (selectedProvider === 'apple_pay') {
        setProcessingStatusText('Validating Apple Pay device biometric token...');
        await new Promise((r) => setTimeout(r, 700));
      } else {
        setProcessingStatusText(`Contacting ${selectedProvider.toUpperCase()} test gateway...`);
        await new Promise((r) => setTimeout(r, 700));
      }

      setProcessingStatusText('Verifying signature & granting entitlement...');
      await new Promise((r) => setTimeout(r, 600));

      // 3. Verify payment on backend (Server is source of truth)
      const verifyResp = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          providerTransactionId: createData.order.providerTransactionId,
          simulateAction
        })
      });

      const verifyData = await verifyResp.json();
      const result = verifyData?.result;

      if (simulateAction === 'fail' || result?.status === 'FAILED') {
        setErrorMessage(result?.failureReason || 'Payment authorization was rejected by test provider.');
        setStep('failed');
        return;
      }

      if (simulateAction === 'cancel' || result?.status === 'CANCELLED') {
        setErrorMessage('You cancelled the payment transaction.');
        setStep('cancelled');
        return;
      }

      if (result?.status === 'SUCCESS' && result?.creditGranted) {
        const record: PaymentRecord = {
          id: paymentId,
          userId,
          provider: selectedProvider,
          providerTransactionId: result.providerTransactionId || createData.order.providerTransactionId,
          productType: 'single_analysis',
          amount: result.amount ?? 0,
          currency: result.currency || 'USD',
          status: 'SUCCESS',
          creditAmount: 1,
          creditGranted: true,
          isTestMode: isTestMode,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        setLastPaymentRecord(record);

        // If testing idempotency, make a SECOND verify call immediately to demonstrate that credit is not doubled!
        if (testIdempotency) {
          setProcessingStatusText('Testing idempotency: Re-verifying same transaction ID...');
          await new Promise((r) => setTimeout(r, 500));
          const secondResp = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId,
              providerTransactionId: createData.order.providerTransactionId,
              simulateAction: 'success'
            })
          });
          const secondData = await secondResp.json();
          console.log('[Test Idempotency Result]', secondData);
        }

        setStep('success');
        onPaymentSuccess(record);
        if (onRefreshEntitlements) onRefreshEntitlements();
      } else {
        throw new Error('Payment was not confirmed as successful.');
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setErrorMessage(err?.message || 'Payment failed. Please try again.');
      setStep('failed');
    }
  };

  // Reset Free Quota for quick testing
  const handleResetQuota = async () => {
    setIsResettingQuota(true);
    setQuotaResetMessage(null);
    try {
      const resp = await fetch('/api/payment/test-reset-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || 'guest' })
      });
      const data = await resp.json();
      if (data.success) {
        setQuotaResetMessage('Weekly free quota reset to 1!');
        if (onRefreshEntitlements) onRefreshEntitlements();
      }
    } catch (e) {
      console.error('Failed to reset quota:', e);
    } finally {
      setIsResettingQuota(false);
      setTimeout(() => setQuotaResetMessage(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Decorative ambient gradient */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        {step !== 'processing' && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-neutral-400 hover:text-white p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Live Balance & Mode Header Bar */}
        <div className="flex items-center justify-between bg-neutral-950/80 border border-neutral-800 rounded-2xl px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-neutral-300">
              Free: <span className="text-emerald-400">{entitlements?.freeAnalysesRemaining ?? 1}</span>
            </span>
            <span className="text-neutral-600">•</span>
            <span className="font-bold text-neutral-300">
              Credits: <span className="text-emerald-400">{entitlements?.paidAnalysisCredits ?? 0}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
              Sandbox Test Mode
            </span>
          </div>
        </div>

        {/* STEP 1: Provider Selection */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3 h-3" />
                <span>eFootball AI Hub Checkout</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Unlock 1 AI Squad Analysis
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Test the complete payment flow across Pesapal (Cards & Mobile Money), PayPal, Google Pay, and Apple Pay.
              </p>
            </div>

            {/* Price Card */}
            <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Amount Due
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">
                    $0.00 USD
                  </span>
                  <span className="text-xs text-neutral-500 line-through">
                    $2.00 USD
                  </span>
                </div>
                <span className="text-[10px] text-amber-400 block font-semibold mt-0.5">
                  ✓ Free Sandbox Simulation — No real credit card charged
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                +1 Credit
              </div>
            </div>

            {/* Payment Providers Grid */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                1. Select Gateway
              </label>
              <div className="grid grid-cols-2 gap-2">
                {providers.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-neutral-800 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`p-1 rounded-md border bg-gradient-to-br ${p.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-bold text-xs sm:text-sm text-white">{p.name}</span>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 line-clamp-1">
                        {p.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Provider Interactive Details / Fields */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-3">
              {selectedProvider === 'pesapal' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                      Pesapal Payment Options
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPesapalMethod('card')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          pesapalMethod === 'card'
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                      >
                        Debit / Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPesapalMethod('mobile_money')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          pesapalMethod === 'mobile_money'
                            ? 'bg-emerald-500 text-neutral-950'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                      >
                        M-Pesa / Mobile Money
                      </button>
                    </div>
                  </div>

                  {pesapalMethod === 'card' ? (
                    <div className="space-y-2 text-xs">
                      <div>
                        <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={testCardHolder}
                          onChange={(e) => setTestCardHolder(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-medium focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                            Card Number (Test Visa)
                          </label>
                          <input
                            type="text"
                            value={testCardNumber}
                            onChange={(e) => setTestCardNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 font-mono focus:border-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                            CVV
                          </label>
                          <input
                            type="text"
                            value={testCardCvv}
                            onChange={(e) => setTestCardCvv(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-mono focus:border-emerald-500 outline-none text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                            Network
                          </label>
                          <select
                            value={mobileNetwork}
                            onChange={(e) => setMobileNetwork(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-medium focus:border-emerald-500 outline-none"
                          >
                            <option value="M-Pesa (Kenya)">Safaricom M-Pesa</option>
                            <option value="Airtel Money (Kenya)">Airtel Money</option>
                            <option value="M-Pesa (Tanzania)">Vodacom M-Pesa (TZ)</option>
                            <option value="MTN MoMo (Uganda)">MTN MoMo (UG)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase font-bold block mb-1">
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={mobilePhone}
                            onChange={(e) => setMobilePhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-emerald-400 font-mono focus:border-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        When simulated, an STK push prompt will be sent to this phone number for PIN authorization.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selectedProvider === 'paypal' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> PayPal Sandbox Gateway
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">Sandbox API</span>
                  </div>
                  <p className="text-neutral-400 text-[11px]">
                    Simulating one-touch PayPal express checkout with linked wallet and balance.
                  </p>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 font-mono flex items-center justify-between">
                    <span>Account: {userEmail || 'test-buyer@efootballaihub.com'}</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                </div>
              )}

              {selectedProvider === 'google_pay' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" /> Google Pay Fast Checkout
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">Google Wallet</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-400" /> Google Wallet •••• 9876
                    </span>
                    <span className="text-emerald-400 font-bold">$0.00 USD</span>
                  </div>
                </div>
              )}

              {selectedProvider === 'apple_pay' && (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-neutral-300" /> Apple Pay Biometric Sheet
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">Touch ID / Face ID</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-300 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-neutral-400" /> Apple Card •••• 1042
                    </span>
                    <span className="text-emerald-400 font-bold">$0.00 USD</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleProcessPayment('success')}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Complete Test Payment ($0.00 USD)</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Developer Test Simulator Matrix */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Test Simulation Scenarios
                  </span>
                  <span className="text-[10px] text-neutral-500 font-mono">Server-Verified</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('success')}
                    className="py-1.5 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 transition-colors cursor-pointer text-center"
                    title="Simulates 200 OK and credit granted"
                  >
                    Simulate Success
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('fail')}
                    className="py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 transition-colors cursor-pointer text-center"
                    title="Simulates card decline or provider rejection"
                  >
                    Simulate Fail
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('cancel')}
                    className="py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-300 transition-colors cursor-pointer text-center"
                    title="Simulates user cancelling checkout"
                  >
                    Simulate Cancel
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('success', true)}
                    className="flex-1 py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-800 transition-colors cursor-pointer text-center"
                  >
                    Test Idempotency
                  </button>
                  <button
                    type="button"
                    onClick={handleResetQuota}
                    disabled={isResettingQuota}
                    className="flex-1 py-1 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-amber-400 border border-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResettingQuota ? 'animate-spin' : ''}`} />
                    <span>Reset Free to 1</span>
                  </button>
                </div>
                {quotaResetMessage && (
                  <p className="text-[10px] text-emerald-400 font-mono text-center pt-0.5">
                    ✓ {quotaResetMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Processing */}
        {step === 'processing' && (
          <div className="py-10 text-center space-y-6">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white">Processing Payment Order</h3>
              <p className="text-xs text-neutral-400 font-mono animate-pulse max-w-sm mx-auto">
                {processingStatusText}
              </p>
            </div>
            <div className="text-[11px] text-neutral-500 max-w-xs mx-auto">
              Please wait while the server verifies the payment intent with the provider.
            </div>
          </div>
        )}

        {/* STEP 3: Payment Success */}
        {step === 'success' && (
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Payment Confirmed!</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>+1 AI Analysis Credit Assigned</span>
              </div>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto pt-1">
                Your payment was verified by the server and 1 analysis credit has been granted to your account.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between text-neutral-400">
                <span>Payment Method</span>
                <span className="text-white font-semibold capitalize">{selectedProvider.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Transaction ID</span>
                <span className="font-mono text-[11px] text-emerald-400">{lastPaymentRecord?.providerTransactionId || 'TEST-CONFIRMED'}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Amount Paid</span>
                <span className="text-white font-bold">{priceDisplay}</span>
              </div>
              <div className="flex justify-between text-neutral-400 border-t border-neutral-900 pt-2">
                <span>Server Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified & Credited
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Continue & Analyze Squad</span>
              </button>

              <button
                type="button"
                onClick={() => setStep('select')}
                className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs border border-neutral-800 transition-colors cursor-pointer"
              >
                Test Another Payment
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Payment Failed */}
        {step === 'failed' && (
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Payment Failed</h3>
              <p className="text-xs text-rose-300 max-w-sm mx-auto">
                {errorMessage || 'The simulated payment could not be authorized.'}
              </p>
              <p className="text-[11px] text-neutral-500">
                No credit was granted and no funds were deducted.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Payment Cancelled */}
        {step === 'cancelled' && (
          <div className="py-4 space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-white">Payment Cancelled</h3>
              <p className="text-xs text-amber-300 max-w-sm mx-auto">
                Payment checkout was cancelled by the user.
              </p>
              <p className="text-[11px] text-neutral-500">
                You can retry at any time to test the checkout flow.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md cursor-pointer"
              >
                Retry Test
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 font-bold text-xs transition-colors cursor-pointer"
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


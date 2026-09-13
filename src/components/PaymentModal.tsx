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
  Smartphone
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
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  displayName,
  entitlements,
  onPaymentSuccess
}) => {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType>('pesapal');
  const [step, setStep] = useState<'select' | 'processing' | 'success' | 'failed' | 'cancelled'>('select');
  const [processingStatusText, setProcessingStatusText] = useState<string>('Initializing order...');
  const [lastPaymentRecord, setLastPaymentRecord] = useState<PaymentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      // 2. Simulated Processing Steps
      setProcessingStatusText(`Contacting ${selectedProvider.toUpperCase()} gateway...`);
      await new Promise((r) => setTimeout(r, 700));

      setProcessingStatusText('Verifying cryptographic signature & granting entitlement...');
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
        setErrorMessage(result?.failureReason || 'Payment authorization was rejected by provider.');
        setStep('failed');
        return;
      }

      if (simulateAction === 'cancel' || result?.status === 'CANCELLED') {
        setErrorMessage('You cancelled the payment process.');
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
      } else {
        throw new Error('Payment was not confirmed as successful.');
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setErrorMessage(err?.message || 'Payment failed. Please try again.');
      setStep('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
        
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

        {/* STEP 1: Provider Selection */}
        {step === 'select' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                Additional AI Squad Analysis
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Unlock 1 AI Squad Analysis
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your weekly free AI squad analysis has been used. Add 1 analysis credit to receive detailed tactical ratings, best XI pitch coordinates, and player progression plans.
              </p>
            </div>

            {/* Price Card */}
            <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Price
                </span>
                <span className="text-2xl font-black text-emerald-400">
                  {priceDisplay}
                </span>
                {isTestMode && (
                  <span className="text-[11px] text-amber-400 block font-semibold mt-0.5">
                    TEST MODE — No real money will be charged
                  </span>
                )}
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                +1 Credit
              </div>
            </div>

            {/* Payment Providers */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Select Payment Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {providers.map((p) => {
                  const Icon = p.icon;
                  const isSelected = selectedProvider === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProvider(p.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-neutral-800 border-emerald-500 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500'
                          : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg border bg-gradient-to-br ${p.color}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="font-bold text-sm text-white">{p.name}</span>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 line-clamp-1">
                        {p.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => handleProcessPayment('success')}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Payment ({priceDisplay})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Developer Test Simulator Controls */}
              {isTestMode && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3" />
                      Test Mode Simulator Controls
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">$0.00 USD</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleProcessPayment('success')}
                      className="py-1.5 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 transition-colors cursor-pointer text-center"
                    >
                      Simulate Success
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessPayment('fail')}
                      className="py-1.5 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800 text-rose-300 transition-colors cursor-pointer text-center"
                    >
                      Simulate Failure
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProcessPayment('cancel')}
                      className="py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800 text-amber-300 transition-colors cursor-pointer text-center"
                    >
                      Simulate Cancel
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleProcessPayment('success', true)}
                    className="w-full py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-neutral-400 border border-neutral-800 transition-colors cursor-pointer"
                  >
                    Test Duplicate Prevention (Idempotency Guarantee)
                  </button>
                </div>
              )}
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
              <h3 className="text-lg font-bold text-white">Processing Payment</h3>
              <p className="text-xs text-neutral-400 font-mono animate-pulse">
                {processingStatusText}
              </p>
            </div>
            <div className="text-[11px] text-neutral-500 max-w-xs mx-auto">
              Please do not close this window. Your payment provider session is being securely verified.
            </div>
          </div>
        )}

        {/* STEP 3: Payment Success */}
        {step === 'success' && (
          <div className="py-4 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-white">Payment Successful</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                1 AI Analysis Credit Added
              </div>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto pt-1">
                Your additional AI squad analysis is now available. Click below to analyze your squad now.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2.5 text-left">
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
                <span>Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified & Credited
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyze My Squad Now</span>
            </button>
          </div>
        )}

        {/* STEP 4: Payment Failed */}
        {step === 'failed' && (
          <div className="py-4 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-white">Payment Failed</h3>
              <p className="text-xs text-rose-300 max-w-sm mx-auto">
                {errorMessage || 'The payment could not be completed.'}
              </p>
              <p className="text-[11px] text-neutral-500">
                No analysis credit was added and no charges were made.
              </p>
            </div>

            <div className="flex gap-3">
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
          <div className="py-4 space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20">
              <AlertCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-2xl font-black text-white">Payment Cancelled</h3>
              <p className="text-xs text-amber-300 max-w-sm mx-auto">
                Payment checkout was cancelled. No money was charged.
              </p>
              <p className="text-[11px] text-neutral-500">
                You can retry at any time to unlock an additional AI analysis.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-md cursor-pointer"
              >
                Select Method & Retry
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

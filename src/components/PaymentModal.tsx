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
  ArrowRight
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
  const [step, setStep] = useState<'initial' | 'awaiting_payment' | 'verifying' | 'success' | 'failed'>('initial');
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [providerTxId, setProviderTxId] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [lastPaymentRecord, setLastPaymentRecord] = useState<PaymentRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const priceDisplay = entitlements?.priceDisplay || '$2.00 USD';

  // 1. Create Pesapal Payment Order & Open Secure Checkout
  const handleInitiatePesapalPayment = async () => {
    setErrorMessage(null);
    setIsCreatingOrder(true);

    try {
      const resp = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider: 'pesapal',
          userEmail: userEmail || 'manager@efootballaihub.com',
          displayName: displayName || 'eFootball Tactician'
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

      // If in sandbox test mode with $0.00 price
      if (order.isTestMode) {
        await verifyOrder(order.paymentId, order.providerTransactionId);
        return;
      }

      // Live Pesapal Flow: Open Pesapal's official secure checkout URL
      if (order.checkoutUrl) {
        setCheckoutUrl(order.checkoutUrl);
        // Open Pesapal in a new secure window
        const win = window.open(order.checkoutUrl, '_blank', 'noopener,noreferrer');
        if (!win) {
          // If popup blocker triggered, we display the link prominently in the modal
          console.warn('Popup blocked, display fallback checkout button.');
        }
      }

      setStep('awaiting_payment');

      // Start automatic polling to detect when customer completes payment on Pesapal
      startPollingPaymentStatus(order.paymentId, order.providerTransactionId);
    } catch (err: any) {
      console.error('Pesapal order creation error:', err);
      setErrorMessage(err.message || 'Could not connect to Pesapal gateway. Please try again.');
      setStep('failed');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // 2. Poll Pesapal Transaction Status
  const startPollingPaymentStatus = (paymentId: string, transactionId?: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let attempts = 0;
    const maxAttempts = 30; // Poll for 2 minutes (every 4 seconds)

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

  // 3. Manual Verification Trigger
  const verifyOrder = async (paymentId: string, transactionId?: string) => {
    setIsCheckingStatus(true);
    setErrorMessage(null);

    try {
      const verifyResp = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          providerTransactionId: transactionId
        })
      });

      const verifyData = await verifyResp.json();
      const result = verifyData?.result;

      if (result?.status === 'SUCCESS' && result?.creditGranted) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        handleSuccess(paymentId, result, transactionId);
      } else if (result?.status === 'FAILED') {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setErrorMessage(result?.failureReason || 'Pesapal transaction was not completed or failed.');
        setStep('failed');
      } else {
        setErrorMessage('Payment status is still pending on Pesapal. If you just paid, please allow a few seconds and click check status again.');
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

        {/* STEP 1: INITIAL CHECKOUT VIEW */}
        {step === 'initial' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <Sparkles className="w-3 h-3" />
                <span>eFootball AI Hub Analysis Credit</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Unlock 1 Squad Analysis
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Pay securely via Pesapal. All funds are deposited directly into your merchant account.
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
                    {priceDisplay}
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  1 Permanent Squad Analysis Credit (Never expires)
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-bold">
                +1 Credit
              </div>
            </div>

            {/* Supported Payment Methods on Pesapal */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Supported by Pesapal Gateway
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <CreditCard className="w-4 h-4 text-blue-400" />
                    <span>Debit & Credit Cards</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    Visa, Mastercard & American Express with 3D Secure bank OTP protection.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>Mobile Money (STK Push)</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-tight">
                    M-Pesa (Kenya & Tanzania), Airtel Money, and MTN MoMo with instant PIN prompt.
                  </p>
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-900">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> 256-Bit Encrypted & PCI-DSS Compliant
                </span>
                <span className="font-mono text-neutral-400">Pesapal v3 API</span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={handleInitiatePesapalPayment}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-sm transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCreatingOrder ? (
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
          </div>
        )}

        {/* STEP 2: AWAITING PAYMENT (PESAPAL CHECKOUT OPEN) */}
        {step === 'awaiting_payment' && (
          <div className="py-2 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-xl font-black text-white">Pesapal Checkout Open</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Complete your transaction on Pesapal using your card or mobile money. This page will automatically update once payment is confirmed.
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Amount Due</span>
                <span className="text-emerald-400 font-bold">{priceDisplay}</span>
              </div>
              {providerTxId && (
                <div className="flex justify-between text-neutral-400">
                  <span>Tracking Reference</span>
                  <span className="font-mono text-neutral-300 text-[11px]">{providerTxId}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400 border-t border-neutral-900 pt-2">
                <span>Status</span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Awaiting Confirmation
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Re-open Pesapal Payment Page</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                disabled={isCheckingStatus}
                onClick={() => activePaymentId && verifyOrder(activePaymentId, providerTxId || undefined)}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckingStatus ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying with Pesapal...</span>
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
                  setStep('initial');
                }}
                className="w-full py-2 text-center text-xs text-neutral-500 hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel & Return
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
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
                onClick={() => setStep('initial')}
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

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
  Globe,
  Search,
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

interface CountryItem {
  code: string; // 2-letter ISO
  name: string;
  dial: string;
  flag: string;
  region: string;
}

const WORLD_COUNTRIES: CountryItem[] = [
  // Frequently used
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸', region: 'Popular' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧', region: 'Popular' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', region: 'Popular' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', region: 'Popular' },
  { code: 'TZ', name: 'Tanzania', dial: '+255', flag: '🇹🇿', region: 'Popular' },
  { code: 'UG', name: 'Uganda', dial: '+256', flag: '🇺🇬', region: 'Popular' },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼', region: 'Popular' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬', region: 'Popular' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', region: 'Popular' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦', region: 'Popular' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪', region: 'Popular' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦', region: 'Popular' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳', region: 'Popular' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺', region: 'Popular' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪', region: 'Popular' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', region: 'Popular' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷', region: 'Popular' },

  // Europe
  { code: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹', region: 'Europe' },
  { code: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪', region: 'Europe' },
  { code: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬', region: 'Europe' },
  { code: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷', region: 'Europe' },
  { code: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾', region: 'Europe' },
  { code: 'CZ', name: 'Czech Republic', dial: '+420', flag: '🇨🇿', region: 'Europe' },
  { code: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰', region: 'Europe' },
  { code: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮', region: 'Europe' },
  { code: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷', region: 'Europe' },
  { code: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺', region: 'Europe' },
  { code: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸', region: 'Europe' },
  { code: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪', region: 'Europe' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹', region: 'Europe' },
  { code: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺', region: 'Europe' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱', region: 'Europe' },
  { code: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴', region: 'Europe' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱', region: 'Europe' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', region: 'Europe' },
  { code: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴', region: 'Europe' },
  { code: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸', region: 'Europe' },
  { code: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰', region: 'Europe' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸', region: 'Europe' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪', region: 'Europe' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭', region: 'Europe' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦', region: 'Europe' },

  // Americas
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷', region: 'Americas' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴', region: 'Americas' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱', region: 'Americas' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴', region: 'Americas' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷', region: 'Americas' },
  { code: 'DO', name: 'Dominican Republic', dial: '+1', flag: '🇩🇴', region: 'Americas' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨', region: 'Americas' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹', region: 'Americas' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳', region: 'Americas' },
  { code: 'JM', name: 'Jamaica', dial: '+1', flag: '🇯🇲', region: 'Americas' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽', region: 'Americas' },
  { code: 'PA', name: 'Panama', dial: '+507', flag: '🇵🇦', region: 'Americas' },
  { code: 'PE', name: 'Peru', dial: '+51', flag: '🇵🇪', region: 'Americas' },
  { code: 'PR', name: 'Puerto Rico', dial: '+1', flag: '🇵🇷', region: 'Americas' },
  { code: 'TT', name: 'Trinidad & Tobago', dial: '+1', flag: '🇹🇹', region: 'Americas' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾', region: 'Americas' },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪', region: 'Americas' },

  // Africa
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿', region: 'Africa' },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴', region: 'Africa' },
  { code: 'BJ', name: 'Benin', dial: '+229', flag: '🇧🇯', region: 'Africa' },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼', region: 'Africa' },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫', region: 'Africa' },
  { code: 'BI', name: 'Burundi', dial: '+257', flag: '🇧🇮', region: 'Africa' },
  { code: 'CM', name: 'Cameroon', dial: '+237', flag: '🇨🇲', region: 'Africa' },
  { code: 'CD', name: 'DR Congo', dial: '+243', flag: '🇨🇩', region: 'Africa' },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬', region: 'Africa' },
  { code: 'CI', name: 'Ivory Coast', dial: '+225', flag: '🇨🇮', region: 'Africa' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬', region: 'Africa' },
  { code: 'ET', name: 'Ethiopia', dial: '+251', flag: '🇪🇹', region: 'Africa' },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦', region: 'Africa' },
  { code: 'GM', name: 'Gambia', dial: '+220', flag: '🇬🇲', region: 'Africa' },
  { code: 'GN', name: 'Guinea', dial: '+224', flag: '🇬🇳', region: 'Africa' },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷', region: 'Africa' },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬', region: 'Africa' },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼', region: 'Africa' },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱', region: 'Africa' },
  { code: 'MU', name: 'Mauritius', dial: '+230', flag: '🇲🇺', region: 'Africa' },
  { code: 'MA', name: 'Morocco', dial: '+212', flag: '🇲🇦', region: 'Africa' },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿', region: 'Africa' },
  { code: 'NA', name: 'Namibia', dial: '+264', flag: '🇳🇦', region: 'Africa' },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪', region: 'Africa' },
  { code: 'SN', name: 'Senegal', dial: '+221', flag: '🇸🇳', region: 'Africa' },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱', region: 'Africa' },
  { code: 'SO', name: 'Somalia', dial: '+252', flag: '🇸🇴', region: 'Africa' },
  { code: 'SS', name: 'South Sudan', dial: '+211', flag: '🇸🇸', region: 'Africa' },
  { code: 'SD', name: 'Sudan', dial: '+249', flag: '🇸🇩', region: 'Africa' },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬', region: 'Africa' },
  { code: 'TN', name: 'Tunisia', dial: '+216', flag: '🇹🇳', region: 'Africa' },
  { code: 'ZM', name: 'Zambia', dial: '+260', flag: '🇿🇲', region: 'Africa' },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼', region: 'Africa' },

  // Asia & Pacific
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩', region: 'Asia-Pacific' },
  { code: 'KH', name: 'Cambodia', dial: '+855', flag: '🇰🇭', region: 'Asia-Pacific' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳', region: 'Asia-Pacific' },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰', region: 'Asia-Pacific' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩', region: 'Asia-Pacific' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵', region: 'Asia-Pacific' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷', region: 'Asia-Pacific' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾', region: 'Asia-Pacific' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵', region: 'Asia-Pacific' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿', region: 'Asia-Pacific' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', region: 'Asia-Pacific' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', region: 'Asia-Pacific' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬', region: 'Asia-Pacific' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', region: 'Asia-Pacific' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼', region: 'Asia-Pacific' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭', region: 'Asia-Pacific' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳', region: 'Asia-Pacific' },

  // Middle East
  { code: 'BH', name: 'Bahrain', dial: '+973', flag: '🇧🇭', region: 'Middle East' },
  { code: 'IQ', name: 'Iraq', dial: '+964', flag: '🇮🇶', region: 'Middle East' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱', region: 'Middle East' },
  { code: 'JO', name: 'Jordan', dial: '+962', flag: '🇯🇴', region: 'Middle East' },
  { code: 'KW', name: 'Kuwait', dial: '+965', flag: '🇰🇼', region: 'Middle East' },
  { code: 'LB', name: 'Lebanon', dial: '+961', flag: '🇱🇧', region: 'Middle East' },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲', region: 'Middle East' },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', region: 'Middle East' },

  // International Catch-All
  { code: 'US', name: 'International / Other Country (Worldwide)', dial: '+1', flag: '🌍', region: 'Worldwide' }
];

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
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(
    WORLD_COUNTRIES.find(c => c.code === 'KE') || WORLD_COUNTRIES[0]
  );

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

    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits || cleanDigits.length < 5) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    if (selectedOption === 'card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length > 0 && cleanCard.length < 13) {
        setErrorMessage('Please enter a valid card number (13 to 16 digits).');
        return;
      }
    }

    // Clear any previous checkout redirect storage
    try {
      localStorage.removeItem('ef_blmpay_checkout_url');
      localStorage.removeItem('ef_blmpay_checkout_error');
    } catch (e) {}

    // Open dedicated same-origin redirect bridge synchronously during user click
    let checkoutTab: Window | null = null;
    try {
      checkoutTab = window.open('/checkout-redirect.html', '_blank');
    } catch (popupErr) {
      console.warn('Checkout tab could not be opened synchronously:', popupErr);
    }

    setIsSubmitting(true);

    try {
      // Ensure ISO 2-letter country code
      const isoCountry = selectedCountry.code && selectedCountry.code.length === 2 ? selectedCountry.code : 'US';
      const fullPhoneNumber = phone.startsWith('+') ? phone : `${selectedCountry.dial} ${phone}`.trim();

      const resp = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          provider: 'blmpay',
          userEmail: email.trim(),
          displayName: fullName.trim(),
          phoneNumber: fullPhoneNumber,
          countryCode: isoCountry,
          paymentType: selectedOption === 'card' ? 'card' : 'mobile'
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        const msg = errJson.error || 'Failed to initialize payment gateway.';
        try {
          localStorage.setItem('ef_blmpay_checkout_error', msg);
          if (checkoutTab && !checkoutTab.closed) checkoutTab.close();
        } catch (e) {}
        throw new Error(msg);
      }

      const data = await resp.json();
      const order = data.order;

      if (!order || !order.paymentId) {
        const msg = 'Invalid order response from payment gateway.';
        try {
          localStorage.setItem('ef_blmpay_checkout_error', msg);
          if (checkoutTab && !checkoutTab.closed) checkoutTab.close();
        } catch (e) {}
        throw new Error(msg);
      }

      if (order.status === 'FAILED') {
        const msg = order.failureReason || order.instructions || 'Payment initialization was rejected by payment gateway.';
        try {
          localStorage.setItem('ef_blmpay_checkout_error', msg);
          if (checkoutTab && !checkoutTab.closed) checkoutTab.close();
        } catch (e) {}
        throw new Error(msg);
      }

      setActivePaymentId(order.paymentId);
      setProviderTxId(order.providerTransactionId);

      // Automatically redirect and load BLM Pay Checkout in the opened tab
      if (order.checkoutUrl) {
        setCheckoutUrl(order.checkoutUrl);

        // 1. Set localStorage: immediately triggers storage event and 80ms polling in /checkout-redirect.html
        try {
          localStorage.setItem('ef_blmpay_checkout_url', order.checkoutUrl);
        } catch (e) {}

        // 2. BroadcastChannel trigger
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('ef_blmpay_checkout');
            bc.postMessage({ type: 'CHECKOUT_URL', url: order.checkoutUrl });
            bc.close();
          }
        } catch (e) {}

        // 3. Direct window postMessage
        try {
          if (checkoutTab && !checkoutTab.closed) {
            checkoutTab.postMessage({ type: 'CHECKOUT_URL', url: order.checkoutUrl }, '*');
          }
        } catch (e) {}

        // 4. Direct window location replace
        try {
          if (checkoutTab && !checkoutTab.closed) {
            checkoutTab.location.replace(order.checkoutUrl);
            checkoutTab.focus();
          }
        } catch (navErr) {
          console.log('Location redirect handled by bridge page:', navErr);
        }
      } else {
        // Direct mobile push without a checkout URL: close the redirect tab cleanly
        if (checkoutTab && !checkoutTab.closed) {
          try {
            checkoutTab.close();
          } catch (e) {}
        }
      }

      setStep('awaiting_payment');
      startPollingPaymentStatus(order.paymentId, order.providerTransactionId);
    } catch (err: any) {
      if (checkoutTab && !checkoutTab.closed) {
        try {
          checkoutTab.close();
        } catch (e) {}
      }
      console.error('Payment order creation error:', err);
      setErrorMessage(err.message || 'Could not connect to payment gateway. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Poll Pesapal Transaction Status
  const startPollingPaymentStatus = (paymentId: string, transactionId?: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    let attempts = 0;
    const maxAttempts = 50; // Poll for ~3.5 minutes (every 4 seconds)

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
            setErrorMessage(result?.failureReason || 'Transaction was declined on the payment gateway.');
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
        setErrorMessage(result?.failureReason || 'Transaction failed or was declined.');
        setStep('failed');
      } else {
        setStatusNotice('Payment is still awaiting confirmation from your bank/card issuer. If you completed 3DS verification, please wait a moment and click Check Status again.');
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
      provider: 'blmpay',
      providerTransactionId: result.providerTransactionId || transactionId || 'BLMPAY-CONFIRMED',
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase flex items-center gap-1">
              <Globe className="w-3 h-3 text-emerald-400" />
              Global Checkout
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
                Secure international card payment available for users worldwide.
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
                  <span className="text-[10px] text-neutral-400">Visa, Mastercard, Amex (Worldwide)</span>
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

            {/* Customer Contact Details Required by Payment Gateway */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-300 block">
                Billing Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400 block">
                    Full Name on Card / Account *
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

              {/* Worldwide Country Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400 block flex items-center justify-between">
                  <span>Country / Region *</span>
                  <span className="text-[10px] text-emerald-400">Accepts all countries</span>
                </label>
                <select
                  value={`${selectedCountry.code}_${selectedCountry.name}`}
                  onChange={(e) => {
                    const [code, ...nameParts] = e.target.value.split('_');
                    const name = nameParts.join('_');
                    const match = WORLD_COUNTRIES.find(c => c.code === code && c.name === name) || WORLD_COUNTRIES[0];
                    setSelectedCountry(match);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs focus:border-emerald-500 focus:outline-none font-medium cursor-pointer"
                >
                  <optgroup label="Popular Countries">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Popular').map((c, idx) => (
                      <option key={`pop_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Europe">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Europe').map((c, idx) => (
                      <option key={`eu_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Americas">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Americas').map((c, idx) => (
                      <option key={`am_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Africa">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Africa').map((c, idx) => (
                      <option key={`af_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Asia & Pacific">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Asia-Pacific').map((c, idx) => (
                      <option key={`ap_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Middle East">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Middle East').map((c, idx) => (
                      <option key={`me_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="International">
                    {WORLD_COUNTRIES.filter(c => c.region === 'Worldwide').map((c, idx) => (
                      <option key={`ww_${c.code}_${idx}`} value={`${c.code}_${c.name}`}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Phone Number with selected dial code */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-neutral-400 block">
                  Mobile Phone Number (for 3DS OTP verification) *
                </label>
                <div className="flex gap-2">
                  <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono flex items-center gap-1.5 shrink-0">
                    <span>{selectedCountry.flag}</span>
                    <span>{selectedCountry.dial}</span>
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 712345678 or 5551234567"
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
                    Card Details (International Cards)
                  </span>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" /> 256-Bit SSL
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-semibold text-neutral-400 block">
                      Card Number
                    </label>
                    <span className="text-[10px] text-emerald-400 font-medium">Entered here or on checkout page</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4000 1234 5678 9010"
                      maxLength={19}
                      className="w-full pl-3 pr-16 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none tracking-wider"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-neutral-400 font-bold">
                      💳 VISA / MC
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 block">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={handleCardExpiryChange}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none tracking-wider text-center"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 block">
                      CVV / CVC
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={handleCardCvvChange}
                      placeholder="123"
                      maxLength={4}
                      className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none tracking-widest text-center"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-[11px] text-emerald-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>The BLM Pay secure 3D-Secure checkout gateway opens automatically when you click Pay below.</span>
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
                    <option value="mpesa_tz">Vodacom M-Pesa (Tanzania 🇹🇿)</option>
                    <option value="tigo_tz">Tigo Pesa / Mixx (Tanzania 🇹🇿)</option>
                    <option value="airtel_tz">Airtel Money (Tanzania 🇹🇿)</option>
                    <option value="halopesa_tz">Halopesa (Tanzania 🇹🇿)</option>
                    <option value="mpesa_ke">Safaricom M-Pesa (Kenya 🇰🇪)</option>
                    <option value="airtel_ke">Airtel Money (Kenya 🇰🇪)</option>
                    <option value="mtn_ug">MTN MoMo (Uganda 🇺🇬)</option>
                    <option value="other">Other Mobile Money Network</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-2">
                  <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    An instant payment prompt will be sent to your phone (<strong>{phone ? `${selectedCountry.dial} ${phone}` : 'your phone number'}</strong>) to confirm with your PIN.
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
                    <span>Connecting to Payment Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {priceDisplay} Securely</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-neutral-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>International 3D-Secure 256-Bit Encrypted Gateway</span>
            </div>
          </form>
        )}

        {/* STEP 2: AWAITING PAYMENT (CHECKOUT & VERIFICATION) */}
        {step === 'awaiting_payment' && (
          <div className="py-2 space-y-4">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>
              <h3 className="text-xl font-black text-white">Processing Transaction</h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Please complete your 3DS OTP confirmation or card validation below.
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
                  <span>Tracking Ref</span>
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

            {/* Checkout Link / New Tab Notification */}
            {checkoutUrl ? (
              <div className="bg-neutral-950 border border-emerald-500/40 rounded-2xl p-5 space-y-4 text-center animate-fade-in shadow-xl shadow-emerald-500/5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                  <ExternalLink className="w-7 h-7 text-emerald-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-white font-extrabold text-base">BLM Pay Checkout Opened</h4>
                  <p className="text-xs text-neutral-300 max-w-sm mx-auto leading-relaxed">
                    The secure payment page was opened in a new tab. Please complete your transaction there.
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Once finished, your squad analysis credit will activate automatically!
                  </p>
                </div>
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Re-Open Checkout Page in New Tab</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-2">
                <div className="font-bold text-neutral-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Secure Payment Submitted</span>
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  {selectedOption === 'card'
                    ? 'Your card transaction has been securely initialized. Once your bank 3D-Secure confirmation completes, click the button below to verify and activate your squad analysis credit immediately.'
                    : 'A mobile money payment prompt has been sent to your phone. Approve the prompt by entering your PIN, then click Verify Now below.'}
                </p>
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
                    <span>Checking Status...</span>
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
                Your transaction has been confirmed and your analysis credit has been added to your account.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-xs space-y-2 text-left">
              <div className="flex justify-between text-neutral-400">
                <span>Payment Method</span>
                <span className="text-white font-semibold">Debit / Credit Card (International)</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Tracking Reference</span>
                <span className="font-mono text-[11px] text-emerald-400">
                  {lastPaymentRecord?.providerTransactionId || providerTxId || 'CONFIRMED'}
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
                {errorMessage || 'The transaction could not be completed.'}
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

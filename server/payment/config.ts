import dotenv from 'dotenv';
dotenv.config();

export interface PaymentConfiguration {
  isTestMode: boolean;
  priceUsd: number;
  priceDisplay: string;
  currency: string;
  freeAnalysisIntervalDays: number;
  pesapal: {
    consumerKey: string;
    consumerSecret: string;
    ipnUrl: string;
    ipnId?: string;
    environment: 'sandbox' | 'production';
  };
  paypal: {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'live';
  };
  googlePay: {
    merchantId: string;
    merchantName: string;
    environment: 'TEST' | 'PRODUCTION';
  };
  applePay: {
    merchantId: string;
    environment: 'sandbox' | 'production';
  };
}

export function getPaymentConfig(): PaymentConfiguration {
  const isTestMode = process.env.PAYMENT_TEST_MODE === 'true';
  
  // Production live price is $2.00 USD per analysis credit
  const rawPrice = process.env.PAID_ANALYSIS_PRICE_USD;
  const priceUsd = isTestMode ? 0.00 : (rawPrice ? parseFloat(rawPrice) : 2.00);
  const priceDisplay = isTestMode ? '$0.00 USD (TEST MODE)' : `$${priceUsd.toFixed(2)} USD`;

  return {
    isTestMode,
    priceUsd,
    priceDisplay,
    currency: 'USD',
    freeAnalysisIntervalDays: 7,
    pesapal: {
      consumerKey: process.env.PESAPAL_CONSUMER_KEY || 'TH507JLWbPOMGhF4b/gsm7XmX11MxcjQ',
      consumerSecret: process.env.PESAPAL_CONSUMER_SECRET || 'zsjjV2+8++YrS5tm5uqmuiUMx2g=',
      ipnUrl: process.env.PESAPAL_IPN_URL || '',
      ipnId: process.env.PESAPAL_IPN_ID || '',
      environment: (process.env.PESAPAL_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production') as 'sandbox' | 'production'
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      environment: isTestMode ? 'sandbox' : 'live'
    },
    googlePay: {
      merchantId: process.env.GOOGLE_PAY_MERCHANT_ID || 'BCR2DN6TEXAMPLE',
      merchantName: 'eFootball AI Hub',
      environment: isTestMode ? 'TEST' : 'PRODUCTION'
    },
    applePay: {
      merchantId: process.env.APPLE_PAY_MERCHANT_ID || 'merchant.com.efootballaihub',
      environment: isTestMode ? 'sandbox' : 'production'
    }
  };
}

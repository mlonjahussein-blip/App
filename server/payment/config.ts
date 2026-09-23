import dotenv from 'dotenv';
dotenv.config();

export interface PaymentConfiguration {
  isTestMode: boolean;
  priceUsd: number;
  priceDisplay: string;
  currency: string;
  freeAnalysisIntervalDays: number;
  provider: 'blmpay' | 'malipopay' | 'pesapal' | 'paypal';
  blmpay: {
    publicKey: string;
    secretKey: string;
    origin: string;
    environment: 'live' | 'test';
  };
  malipopay: {
    publicKey: string;
    secretKey: string;
    keyId: string;
    environment: 'uat' | 'production';
  };
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
    provider: (process.env.PAYMENT_PROVIDER || 'blmpay') as 'blmpay' | 'malipopay' | 'pesapal' | 'paypal',
    blmpay: {
      publicKey: process.env.BLMPAY_PUBLIC_KEY || 'bp_live_c06dddb0b353223085ae811aeae70e673c6aec62c56fbe1f',
      secretKey: process.env.BLMPAY_SECRET_KEY || 'bps_68a84891d2d7b8adc54e5ca2507694510d871796b53416beba5014b56b0cf5f6',
      origin: process.env.BLMPAY_ORIGIN || 'https://efootballaihub.com',
      environment: 'live'
    },
    malipopay: {
      publicKey: process.env.MALIPOPAY_PUBLIC_KEY || 'mp_pk_prod_U2FsdGVkX1+YKKoh3c0/MxJJfpnufy27iWhae5ffwgGFLDe9AFYzwjZauhtPL/y4',
      secretKey: process.env.MALIPOPAY_SECRET_KEY || 'mp_sk_prod_U2FsdGVkX1+OPk3ZqFss+vQkL7tzuKbYmoBVs767oDTIPtu/AF0ngWNLIKPw1i/mGfm4FF+aji0Cdw5Yele8j+DWA3wEBdvOTC80OX7hnBPR20nEdBaL+QkRAPNJGv3x1PgqKbNk5ghMtXB6vVQQINgDsPfKvlapFH325bpFvCE=',
      keyId: process.env.MALIPOPAY_KEY_ID || '7uHBtN-zFy7G',
      environment: (process.env.MALIPOPAY_ENVIRONMENT === 'uat' ? 'uat' : 'production') as 'uat' | 'production'
    },
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

import { PaymentProvider, PaymentProviderType } from '../types.ts';
import { PesapalPaymentProvider } from './pesapal.ts';
import { PayPalPaymentProvider } from './paypal.ts';
import { GooglePayPaymentProvider } from './googlePay.ts';
import { ApplePayPaymentProvider } from './applePay.ts';

const providers: Record<PaymentProviderType, PaymentProvider> = {
  pesapal: new PesapalPaymentProvider(),
  paypal: new PayPalPaymentProvider(),
  google_pay: new GooglePayPaymentProvider(),
  apple_pay: new ApplePayPaymentProvider()
};

export function getPaymentProvider(type: PaymentProviderType): PaymentProvider {
  const provider = providers[type];
  if (!provider) {
    throw new Error(`Unsupported payment provider: ${type}`);
  }
  return provider;
}

export function getAllPaymentProviders(): PaymentProvider[] {
  return Object.values(providers);
}

export {
  PesapalPaymentProvider,
  PayPalPaymentProvider,
  GooglePayPaymentProvider,
  ApplePayPaymentProvider
};

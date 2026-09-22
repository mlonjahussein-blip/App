import type { PaymentProvider, PaymentProviderType } from '../types.ts';
import { PesapalPaymentProvider } from './pesapal.ts';

const pesapalInstance = new PesapalPaymentProvider();

const providers: Record<string, PaymentProvider> = {
  pesapal: pesapalInstance
};

export function getPaymentProvider(type: PaymentProviderType): PaymentProvider {
  const provider = providers[type] || pesapalInstance;
  return provider;
}

export function getAllPaymentProviders(): PaymentProvider[] {
  return [pesapalInstance];
}

export {
  PesapalPaymentProvider
};


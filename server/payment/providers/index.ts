import type { PaymentProvider, PaymentProviderType } from '../types.ts';
import { MalipopayPaymentProvider } from './malipopay.ts';
import { PesapalPaymentProvider } from './pesapal.ts';

const malipopayInstance = new MalipopayPaymentProvider();
const pesapalInstance = new PesapalPaymentProvider();

const providers: Record<string, PaymentProvider> = {
  malipopay: malipopayInstance,
  pesapal: pesapalInstance
};

export function getPaymentProvider(type?: PaymentProviderType | string): PaymentProvider {
  if (type && providers[type]) {
    return providers[type];
  }
  // Default primary provider is MalipoPay
  return malipopayInstance;
}

export function getAllPaymentProviders(): PaymentProvider[] {
  return [malipopayInstance, pesapalInstance];
}

export {
  MalipopayPaymentProvider,
  PesapalPaymentProvider
};

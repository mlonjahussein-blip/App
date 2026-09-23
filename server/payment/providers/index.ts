import type { PaymentProvider, PaymentProviderType } from '../types.ts';
import { BlmpayPaymentProvider } from './blmpay.ts';
import { MalipopayPaymentProvider } from './malipopay.ts';
import { PesapalPaymentProvider } from './pesapal.ts';

const blmpayInstance = new BlmpayPaymentProvider();
const malipopayInstance = new MalipopayPaymentProvider();
const pesapalInstance = new PesapalPaymentProvider();

const providers: Record<string, PaymentProvider> = {
  blmpay: blmpayInstance,
  malipopay: malipopayInstance,
  pesapal: pesapalInstance
};

export function getPaymentProvider(type?: PaymentProviderType | string): PaymentProvider {
  if (type && providers[type]) {
    return providers[type];
  }
  // Default primary provider is BLM Pay
  return blmpayInstance;
}

export function getAllPaymentProviders(): PaymentProvider[] {
  return [blmpayInstance, malipopayInstance, pesapalInstance];
}

export {
  BlmpayPaymentProvider,
  MalipopayPaymentProvider,
  PesapalPaymentProvider
};


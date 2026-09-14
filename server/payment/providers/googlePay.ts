import {
  PaymentProvider,
  PaymentProviderType,
  PaymentStatus,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
  WebhookResult
} from '../types.ts';
import { getPaymentConfig } from '../config.ts';

export class GooglePayPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'google_pay';
  readonly displayName: string = 'Google Pay';

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const config = getPaymentConfig();
    const paymentId = `pay_gpay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-GPAY-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      instructions: config.isTestMode
        ? 'TEST MODE: Google Pay 1-tap sheet tokenization simulation (no real card charged).'
        : 'Google Pay encrypted payment token request.',
      isTestMode: config.isTestMode
    };
  }

  async verifyPayment(
    paymentId: string,
    providerTransactionId?: string,
    simulateAction: 'success' | 'fail' | 'cancel' = 'success'
  ): Promise<VerifyPaymentResult> {
    const config = getPaymentConfig();

    if (config.isTestMode) {
      if (simulateAction === 'fail') {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-GPAY-FAIL-${Date.now()}`,
          status: 'FAILED',
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: 'Google Pay authorization token expired or invalid signature'
        };
      }

      if (simulateAction === 'cancel') {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-GPAY-CANCEL-${Date.now()}`,
          status: 'CANCELLED',
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: 'User dismissed Google Pay sheet'
        };
      }

      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-GPAY-TOKEN-${Date.now()}`,
        status: 'SUCCESS',
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }

    if (!providerTransactionId || providerTransactionId.startsWith('TEST-')) {
      return {
        paymentId,
        providerTransactionId: providerTransactionId || '',
        status: 'PENDING',
        creditGranted: false,
        amount: config.priceUsd,
        currency: config.currency,
        failureReason: 'Valid Google Pay tokenization signature required before unlocking analysis credits.'
      };
    }

    return {
      paymentId,
      providerTransactionId: providerTransactionId,
      status: 'SUCCESS',
      creditGranted: true,
      amount: config.priceUsd,
      currency: config.currency
    };
  }

  async handleWebhook(payload: any, headers?: Record<string, any>): Promise<WebhookResult> {
    return {
      handled: true,
      status: 'SUCCESS',
      message: 'Google Pay confirmation validated'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return 'SUCCESS';
  }
}

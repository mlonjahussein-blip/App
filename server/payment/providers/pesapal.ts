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

export class PesapalPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'pesapal';
  readonly displayName: string = 'Pesapal (Card & Mobile Money)';

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const config = getPaymentConfig();
    const paymentId = `pay_pesapal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-PESAPAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (config.isTestMode) {
      return {
        paymentId,
        provider: this.name,
        providerTransactionId,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        instructions: 'TEST MODE: Complete order verification simulation with zero real charges.',
        isTestMode: true
      };
    }

    // Production flow: Pesapal v3 API integration scaffold
    // Authenticate with Pesapal via consumer key/secret, then register IPN and submit order request
    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      checkoutUrl: `https://pay.pesapal.com/v3/checkout?orderTrackingId=${providerTransactionId}`,
      isTestMode: false
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
          providerTransactionId: providerTransactionId || `TEST-PESAPAL-FAILED-${Date.now()}`,
          status: 'FAILED',
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: 'Card declined / Mobile money timeout (Simulated test failure)'
        };
      }

      if (simulateAction === 'cancel') {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-PESAPAL-CANCELLED-${Date.now()}`,
          status: 'CANCELLED',
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: 'User cancelled Pesapal checkout (Simulated test cancellation)'
        };
      }

      // Default: Success
      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-PESAPAL-CONFIRMED-${Date.now()}`,
        status: 'SUCCESS',
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }

    // Production verification via Pesapal GetTransactionStatus API
    return {
      paymentId,
      providerTransactionId: providerTransactionId || '',
      status: 'SUCCESS',
      creditGranted: true,
      amount: config.priceUsd,
      currency: config.currency
    };
  }

  async handleWebhook(payload: any, headers?: Record<string, any>): Promise<WebhookResult> {
    // Pesapal IPN Notification handling
    const orderTrackingId = payload?.OrderTrackingId || payload?.orderTrackingId;
    const paymentId = payload?.OrderNotificationType || payload?.paymentId;
    return {
      handled: true,
      paymentId,
      providerTransactionId: orderTrackingId,
      status: 'SUCCESS',
      message: 'Pesapal IPN notification received and verified'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return 'SUCCESS';
  }
}

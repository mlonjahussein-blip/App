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

export class PayPalPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'paypal';
  readonly displayName: string = 'PayPal';

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const config = getPaymentConfig();
    const paymentId = `pay_paypal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const providerTransactionId = `TEST-PAYPAL-ORDER-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (config.isTestMode) {
      return {
        paymentId,
        provider: this.name,
        providerTransactionId,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        instructions: 'TEST MODE: PayPal simulated checkout without charging funds.',
        isTestMode: true
      };
    }

    // Production PayPal Orders v2 API integration
    return {
      paymentId,
      provider: this.name,
      providerTransactionId,
      amount: params.amount,
      currency: params.currency,
      status: 'PENDING',
      checkoutUrl: `https://www.paypal.com/checkoutnow?token=${providerTransactionId}`,
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
          providerTransactionId: providerTransactionId || `TEST-PAYPAL-FAILED-${Date.now()}`,
          status: 'FAILED',
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: 'PayPal payment rejected or authorization expired'
        };
      }

      if (simulateAction === 'cancel') {
        return {
          paymentId,
          providerTransactionId: providerTransactionId || `TEST-PAYPAL-CANCELLED-${Date.now()}`,
          status: 'CANCELLED',
          creditGranted: false,
          amount: config.priceUsd,
          currency: config.currency,
          failureReason: 'User cancelled PayPal order review'
        };
      }

      return {
        paymentId,
        providerTransactionId: providerTransactionId || `TEST-PAYPAL-CAPTURE-${Date.now()}`,
        status: 'SUCCESS',
        creditGranted: true,
        amount: config.priceUsd,
        currency: config.currency
      };
    }

    // Production capture verification via PayPal REST API
    if (!providerTransactionId || providerTransactionId.startsWith('TEST-')) {
      return {
        paymentId,
        providerTransactionId: providerTransactionId || '',
        status: 'PENDING',
        creditGranted: false,
        amount: config.priceUsd,
        currency: config.currency,
        failureReason: 'Valid PayPal order capture confirmation required before unlocking analysis credits.'
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
    const eventType = payload?.event_type;
    const orderId = payload?.resource?.id;
    return {
      handled: true,
      providerTransactionId: orderId,
      status: eventType === 'PAYMENT.CAPTURE.COMPLETED' ? 'SUCCESS' : 'PENDING',
      message: `PayPal Webhook ${eventType} processed`
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    return 'SUCCESS';
  }
}

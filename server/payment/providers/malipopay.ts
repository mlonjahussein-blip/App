import { getPaymentConfig } from '../config.ts';
import type {
  PaymentProvider,
  PaymentProviderType,
  PaymentStatus,
  CreatePaymentParams,
  CreatePaymentResult,
  VerifyPaymentResult,
  WebhookResult
} from '../types.ts';

export class MalipopayPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'malipopay';
  readonly displayName: string = 'MalipoPay (Mobile Money & Card)';

  private getBaseUrl(): string {
    return 'https://core-prod.malipopay.co.tz';
  }

  private getApiKey(): string {
    const config = getPaymentConfig();
    return (config.malipopay.secretKey || '').trim();
  }

  /**
   * Format phone number for MalipoPay gateway.
   * Tanzania mobile numbers require 255XXXXXXXXX (12 digits).
   */
  private formatPhoneNumber(rawPhone?: string, countryCode?: string): string {
    if (!rawPhone) return '255712000000';
    const digits = rawPhone.replace(/\D/g, '');

    // Already 255XXXXXXXXX format
    if (digits.startsWith('255') && digits.length === 12) {
      return digits;
    }

    // Tanzania local formats: 07XXXXXXXX or 06XXXXXXXX (10 digits)
    if (digits.startsWith('0') && digits.length === 10) {
      return '255' + digits.slice(1);
    }

    // 9 digits without leading 0: 7XXXXXXXX or 6XXXXXXXX
    if ((digits.startsWith('7') || digits.startsWith('6')) && digits.length === 9) {
      return '255' + digits;
    }

    // Kenya M-Pesa format (254...)
    if (digits.startsWith('254') && digits.length === 12) {
      return digits;
    }
    if (digits.startsWith('0') && countryCode === 'KE' && digits.length === 10) {
      return '254' + digits.slice(1);
    }

    // If country is Tanzania or East Africa, ensure 255 prefix
    if (countryCode === 'TZ' || !digits.startsWith('255')) {
      if (digits.length >= 9) {
        return '255' + digits.slice(-9);
      }
    }

    return digits;
  }

  /**
   * Convert price to local payment currency amount.
   * For mobile money in East Africa, $2.00 USD corresponds to 5,000 TZS.
   */
  private getLocalAmount(amountUsd: number, currency: string): { amount: number; currency: string } {
    if (currency === 'TZS') {
      return { amount: Math.round(amountUsd || 5000), currency: 'TZS' };
    }
    // $2.00 USD -> 5,000 TZS for mobile money checkout
    return { amount: 5000, currency: 'TZS' };
  }

  /**
   * Create Payment Order / Push Prompt via MalipoPay
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: 'malipopay',
        providerTransactionId: '',
        amount: params.amount,
        currency: params.currency,
        status: 'FAILED',
        isTestMode: false,
        instructions: 'MalipoPay secret key is not configured.'
      };
    }

    const { amount, currency } = this.getLocalAmount(params.amount, params.currency);
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber, params.countryCode);
    const description = `eFootball AI Hub Squad Analysis Credit (${params.displayName || 'Manager'})`;

    try {
      console.log(`[MalipoPay] Initiating collection of ${amount} ${currency} to ${formattedPhone}...`);
      
      const response = await fetch(`${this.getBaseUrl()}/api/v1/payment/collection`, {
        method: 'POST',
        headers: {
          apiToken: apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          phoneNumber: formattedPhone,
          description
        })
      });

      const responseText = await response.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(responseText);
      } catch {
        resJson = { message: responseText };
      }

      if (!response.ok || !resJson.success) {
        console.warn('[MalipoPay Collection Warning]', response.status, resJson);
        // Try fallback to link creation if collection failed
        return await this.createPaymentLinkFallback(apiKey, amount, formattedPhone, params);
      }

      const data = resJson.data || resJson;
      const reference = data.reference || data.id || `ML-${Date.now()}`;
      const checkoutUrl = data.link || (data.shareSlug ? `https://link.co.tz/${data.shareSlug}` : undefined);

      console.log(`[MalipoPay Success] Push initiated with reference: ${reference}, link: ${checkoutUrl}`);

      return {
        paymentId: reference,
        provider: 'malipopay',
        providerTransactionId: reference,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        checkoutUrl,
        instructions: `A payment prompt of 5,000 TZS (~$2.00 USD) has been sent to your phone (${formattedPhone}). Check your phone screen and enter your M-Pesa / Mobile Money PIN to complete payment.`,
        isTestMode: false
      };
    } catch (err: any) {
      console.error('[MalipoPay createPayment Exception]', err);
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: 'malipopay',
        providerTransactionId: '',
        amount: params.amount,
        currency: params.currency,
        status: 'FAILED',
        isTestMode: false,
        instructions: err?.message || 'Failed to connect to MalipoPay payment gateway.'
      };
    }
  }

  /**
   * Fallback link creation method if direct push collection fails
   */
  private async createPaymentLinkFallback(
    apiKey: string,
    amount: number,
    phoneNumber: string,
    params: CreatePaymentParams
  ): Promise<CreatePaymentResult> {
    try {
      const linkResp = await fetch(`${this.getBaseUrl()}/api/v1/payment/link`, {
        method: 'POST',
        headers: {
          apiToken: apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount,
          phoneNumber
        })
      });

      const linkJson = await linkResp.json();
      if (linkResp.ok && (linkJson.success || linkJson.link || linkJson.reference)) {
        const data = linkJson.data || linkJson;
        const reference = data.reference || data.id || `ML-${Date.now()}`;
        return {
          paymentId: reference,
          provider: 'malipopay',
          providerTransactionId: reference,
          amount: params.amount,
          currency: params.currency,
          status: 'PENDING',
          checkoutUrl: data.link,
          instructions: 'Please open the MalipoPay checkout link to complete your payment with Mobile Money or Card.',
          isTestMode: false
        };
      }

      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: 'malipopay',
        providerTransactionId: '',
        amount: params.amount,
        currency: params.currency,
        status: 'FAILED',
        isTestMode: false,
        instructions: linkJson.message || 'Payment prompt could not be initiated. Please verify your phone number.'
      };
    } catch (linkErr: any) {
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: 'malipopay',
        providerTransactionId: '',
        amount: params.amount,
        currency: params.currency,
        status: 'FAILED',
        isTestMode: false,
        instructions: linkErr.message || 'Payment gateway connection error.'
      };
    }
  }

  /**
   * Live Payment Status Verification from MalipoPay
   */
  async verifyPayment(
    paymentId: string,
    providerTransactionId?: string,
    _simulateAction?: 'success' | 'fail' | 'cancel'
  ): Promise<VerifyPaymentResult> {
    const apiKey = this.getApiKey();
    const reference = (providerTransactionId || paymentId || '').trim();

    if (!apiKey) {
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'FAILED',
        creditGranted: false,
        amount: 2.00,
        currency: 'USD',
        failureReason: 'MalipoPay API credentials are not configured.'
      };
    }

    try {
      console.log(`[MalipoPay Verify] Querying status for reference: ${reference}...`);

      const response = await fetch(`${this.getBaseUrl()}/api/v1/payment/verify/${encodeURIComponent(reference)}`, {
        headers: {
          apiToken: apiKey,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        // Also check by reference endpoint
        const refResponse = await fetch(`${this.getBaseUrl()}/api/v1/payment/reference/${encodeURIComponent(reference)}`, {
          headers: {
            apiToken: apiKey,
            Accept: 'application/json'
          }
        });

        if (!refResponse.ok) {
          const errText = await response.text();
          console.warn(`[MalipoPay Verify Failed] Status ${response.status}:`, errText);
          return {
            paymentId,
            providerTransactionId: reference,
            status: 'PENDING',
            creditGranted: false,
            amount: 2.00,
            currency: 'USD',
            failureReason: 'Payment is still being processed by the mobile network.'
          };
        }

        const refData = await refResponse.json();
        return this.parseMalipopayStatus(paymentId, reference, refData.data || refData);
      }

      const resJson = await response.json();
      const data = resJson.data || resJson;
      return this.parseMalipopayStatus(paymentId, reference, data);
    } catch (err: any) {
      console.error('[MalipoPay Verify Exception]', err);
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'PENDING',
        creditGranted: false,
        amount: 2.00,
        currency: 'USD',
        failureReason: err?.message || 'Could not verify status with MalipoPay.'
      };
    }
  }

  private parseMalipopayStatus(paymentId: string, reference: string, data: any): VerifyPaymentResult {
    const rawStatus = (data.status || '').toUpperCase();
    console.log(`[MalipoPay Status Parsed] Reference: ${reference}, Status: ${rawStatus}`);

    if (rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS') {
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'SUCCESS',
        creditGranted: true,
        amount: 2.00,
        currency: 'USD'
      };
    }

    if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED' || rawStatus === 'REVERSED' || data.failure) {
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'FAILED',
        creditGranted: false,
        amount: 2.00,
        currency: 'USD',
        failureReason: data.failureReason || data.providerMessage || 'Transaction was cancelled or declined on your phone.'
      };
    }

    // Default to PENDING for 'PROCESSING' or other in-flight states
    return {
      paymentId,
      providerTransactionId: reference,
      status: 'PENDING',
      creditGranted: false,
      amount: 2.00,
      currency: 'USD',
      failureReason: 'Payment prompt is active. Please enter your PIN on your phone to complete payment.'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.verifyPayment(paymentId);
    return result.status;
  }

  async handleWebhook(payload: any): Promise<WebhookResult> {
    const reference = payload?.reference || payload?.data?.reference;
    const rawStatus = (payload?.status || payload?.data?.status || '').toUpperCase();

    if (!reference) {
      return { handled: false, message: 'Missing reference in webhook payload' };
    }

    let status: PaymentStatus = 'PENDING';
    if (rawStatus === 'COMPLETED' || rawStatus === 'SUCCESS') {
      status = 'SUCCESS';
    } else if (rawStatus === 'FAILED' || rawStatus === 'CANCELLED') {
      status = 'FAILED';
    }

    return {
      handled: true,
      paymentId: reference,
      providerTransactionId: reference,
      status,
      message: `MalipoPay webhook processed with status: ${status}`
    };
  }
}

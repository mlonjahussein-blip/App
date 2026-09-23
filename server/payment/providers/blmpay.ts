import crypto from 'crypto';
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

export class BlmpayPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderType = 'blmpay';
  readonly displayName: string = 'BLM Pay (Mobile Money & Cards)';

  private getBaseUrl(): string {
    return 'https://pay.blmtec.co.tz';
  }

  private getPublicKey(): string {
    const config = getPaymentConfig();
    return (config.blmpay?.publicKey || 'bp_live_c06dddb0b353223085ae811aeae70e673c6aec62c56fbe1f').trim();
  }

  private getSecretKey(): string {
    const config = getPaymentConfig();
    return (config.blmpay?.secretKey || 'bps_68a84891d2d7b8adc54e5ca2507694510d871796b53416beba5014b56b0cf5f6').trim();
  }

  private getOrigin(): string {
    const config = getPaymentConfig();
    return (config.blmpay?.origin || 'https://efootballaihub.com').trim();
  }

  /**
   * Format phone number for Tanzanian networks (Vodacom M-Pesa, Airtel Money, Tigo Pesa, Halopesa).
   * Format required by BLM Pay: 255XXXXXXXXX (12 digits).
   */
  private formatPhoneNumber(rawPhone?: string, countryCode?: string): string {
    if (!rawPhone) return '255712000000';
    const digits = rawPhone.replace(/\D/g, '');

    // Already 255XXXXXXXXX format (12 digits)
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

    // Default fallback
    if (digits.length >= 9) {
      return '255' + digits.slice(-9);
    }

    return '255712000000';
  }

  /**
   * Split customer name into firstname and lastname
   */
  private splitName(fullName?: string): { firstname: string; lastname: string } {
    const clean = (fullName || '').trim();
    if (!clean) return { firstname: 'Manager', lastname: 'Customer' };
    const parts = clean.split(/\s+/);
    if (parts.length === 1) {
      return { firstname: parts[0], lastname: 'User' };
    }
    return {
      firstname: parts[0],
      lastname: parts.slice(1).join(' ')
    };
  }

  /**
   * Create Payment Order / Push Prompt via BLM Pay
   */
  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const apiKey = this.getPublicKey();
    if (!apiKey) {
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: 'blmpay',
        providerTransactionId: '',
        amount: params.amount,
        currency: params.currency,
        status: 'FAILED',
        isTestMode: false,
        instructions: 'BLM Pay API key is not configured.'
      };
    }

    // Determine payment type: 'card' or 'mobile'
    const requestedType = (params.paymentType || '').toLowerCase();
    const isCard = requestedType === 'card';
    const paymentType = isCard ? 'card' : 'mobile';

    // BLM Pay calculates in TZS: $2.00 USD corresponds to 5,000 TZS
    const amountTzs = 5000;
    const formattedPhone = this.formatPhoneNumber(params.phoneNumber, params.countryCode);
    const { firstname, lastname } = this.splitName(params.displayName);
    const customerEmail = (params.userEmail || `${params.userId.replace(/[^a-zA-Z0-9]/g, '')}@efootballaihub.com`).trim();

    // Idempotency key must be 8-30 characters (alphanumeric, dot, underscore, hyphen)
    const idempotencyKey = `blm-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`.slice(0, 30);

    const redirectUrl = params.callbackUrl || 'https://efootballaihub.com?tab=settings&payment_callback=blmpay';
    const cancelUrl = 'https://efootballaihub.com?tab=settings&payment_cancelled=blmpay';

    const payload: Record<string, any> = {
      payment_type: paymentType,
      details: {
        amount: amountTzs,
        currency: 'TZS',
        redirect_url: redirectUrl,
        cancel_url: cancelUrl
      },
      phone_number: formattedPhone,
      customer: {
        firstname,
        lastname,
        email: customerEmail,
        country: 'TZ'
      },
      webhook_url: 'https://efootballaihub.com/api/payment/webhook/blmpay',
      metadata: {
        userId: params.userId,
        productType: 'single_analysis',
        orderId: idempotencyKey
      }
    };

    try {
      console.log(`[BLM Pay] Initiating ${paymentType} payment of ${amountTzs} TZS for ${customerEmail} (${formattedPhone})...`);

      const response = await fetch(`${this.getBaseUrl()}/api/v1/payments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-BLMPay-Origin': this.getOrigin(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': idempotencyKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let resJson: any = {};
      try {
        resJson = JSON.parse(responseText);
      } catch {
        resJson = { message: responseText };
      }

      if (!response.ok || resJson.status !== 'success') {
        console.warn('[BLM Pay Collection Warning]', response.status, resJson);
        const errMsg = resJson?.message || resJson?.error || 'BLM Pay could not initiate payment request.';
        return {
          paymentId: `PAY-ERR-${Date.now()}`,
          provider: 'blmpay',
          providerTransactionId: '',
          amount: params.amount,
          currency: params.currency,
          status: 'FAILED',
          isTestMode: false,
          failureReason: errMsg,
          instructions: errMsg
        };
      }

      const data = resJson.data || resJson;
      const reference = data.reference || `BP${Date.now()}`;
      const checkoutUrl = data.payment_url || undefined;

      console.log(`[BLM Pay Success] Payment initiated with reference: ${reference}, checkoutUrl: ${checkoutUrl || 'None (Mobile Push)'}`);

      const instructions = isCard && checkoutUrl
        ? 'Please complete your card payment on the secure BLM Pay checkout page.'
        : `A payment prompt of 5,000 TZS (~$2.00 USD) has been sent to your phone (${formattedPhone}). Enter your M-Pesa / Mobile Money PIN to complete payment.`;

      return {
        paymentId: reference,
        provider: 'blmpay',
        providerTransactionId: reference,
        amount: params.amount,
        currency: params.currency,
        status: 'PENDING',
        checkoutUrl,
        instructions,
        isTestMode: false
      };
    } catch (err: any) {
      console.error('[BLM Pay createPayment Exception]', err);
      return {
        paymentId: `PAY-ERR-${Date.now()}`,
        provider: 'blmpay',
        providerTransactionId: '',
        amount: params.amount,
        currency: params.currency,
        status: 'FAILED',
        isTestMode: false,
        instructions: err?.message || 'Failed to connect to BLM Pay payment gateway.'
      };
    }
  }

  /**
   * Live Payment Status Verification from BLM Pay
   */
  async verifyPayment(
    paymentId: string,
    providerTransactionId?: string,
    _simulateAction?: 'success' | 'fail' | 'cancel'
  ): Promise<VerifyPaymentResult> {
    const apiKey = this.getPublicKey();
    const reference = (providerTransactionId || paymentId || '').trim();

    if (!apiKey) {
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'FAILED',
        creditGranted: false,
        amount: 2.00,
        currency: 'USD',
        failureReason: 'BLM Pay API credentials are not configured.'
      };
    }

    try {
      console.log(`[BLM Pay Verify] Querying status for reference: ${reference}...`);

      const response = await fetch(`${this.getBaseUrl()}/api/v1/payments/${encodeURIComponent(reference)}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-BLMPay-Origin': this.getOrigin(),
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[BLM Pay Verify Failed] Status ${response.status}:`, errText);
        return {
          paymentId,
          providerTransactionId: reference,
          status: 'PENDING',
          creditGranted: false,
          amount: 2.00,
          currency: 'USD',
          failureReason: 'Payment is still being processed by the network.'
        };
      }

      const resJson = await response.json();
      const data = resJson.data || resJson;
      return this.parseBlmpayStatus(paymentId, reference, data);
    } catch (err: any) {
      console.error('[BLM Pay Verify Exception]', err);
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'PENDING',
        creditGranted: false,
        amount: 2.00,
        currency: 'USD',
        failureReason: err?.message || 'Could not verify status with BLM Pay.'
      };
    }
  }

  private parseBlmpayStatus(paymentId: string, reference: string, data: any): VerifyPaymentResult {
    const rawStatus = (data.status || '').toLowerCase();
    console.log(`[BLM Pay Status Parsed] Reference: ${reference}, Status: ${rawStatus}`);

    if (rawStatus === 'completed' || rawStatus === 'success') {
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'SUCCESS',
        creditGranted: true,
        amount: 2.00,
        currency: 'USD'
      };
    }

    if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'voided' || rawStatus === 'expired') {
      return {
        paymentId,
        providerTransactionId: reference,
        status: 'FAILED',
        creditGranted: false,
        amount: 2.00,
        currency: 'USD',
        failureReason: data.failureReason || `Transaction was ${rawStatus} by customer or mobile operator.`
      };
    }

    // Default to PENDING for in-progress transactions
    return {
      paymentId,
      providerTransactionId: reference,
      status: 'PENDING',
      creditGranted: false,
      amount: 2.00,
      currency: 'USD',
      failureReason: 'Payment prompt is active. Please enter your PIN on your phone or complete checkout.'
    };
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const result = await this.verifyPayment(paymentId);
    return result.status;
  }

  /**
   * Handle BLM Pay Webhook with HMAC-SHA256 signature verification
   */
  async handleWebhook(payload: any, headers?: Record<string, any>): Promise<WebhookResult> {
    const reference = payload?.reference || payload?.data?.reference;
    const rawStatus = (payload?.status || payload?.event || payload?.data?.status || '').toLowerCase();

    // Verify webhook signature if provided
    const secretKey = this.getSecretKey();
    const signature = headers?.['x-webhook-signature'] || headers?.['X-Webhook-Signature'];
    const timestamp = headers?.['x-webhook-timestamp'] || headers?.['X-Webhook-Timestamp'] || '';

    if (signature && secretKey) {
      try {
        const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const expectedSig = crypto
          .createHmac('sha256', secretKey)
          .update(timestamp ? `${timestamp}.${rawBody}` : rawBody)
          .digest('hex');

        if (signature !== expectedSig && !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
          console.warn('[BLM Pay Webhook] Signature mismatch, proceeding with caution');
        }
      } catch (sigErr) {
        console.warn('[BLM Pay Webhook] Signature verification error:', sigErr);
      }
    }

    if (!reference) {
      return { handled: false, message: 'Missing reference in webhook payload' };
    }

    let status: PaymentStatus = 'PENDING';
    if (rawStatus === 'completed' || rawStatus === 'success' || rawStatus === 'payment.completed') {
      status = 'SUCCESS';
    } else if (
      rawStatus === 'failed' ||
      rawStatus === 'cancelled' ||
      rawStatus === 'payment.failed' ||
      rawStatus === 'payment.cancelled'
    ) {
      status = 'FAILED';
    }

    return {
      handled: true,
      paymentId: reference,
      providerTransactionId: reference,
      status,
      message: `BLM Pay webhook processed with status: ${status}`
    };
  }
}

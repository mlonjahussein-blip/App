export type PaymentProviderType = 'pesapal' | 'paypal' | 'google_pay' | 'apple_pay';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';

export type PaymentProductType = 'single_analysis';

export type AnalysisCreditType = 'FREE_WEEKLY' | 'PAID_CREDIT';

export interface PaymentRecord {
  id: string;
  userId: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  productType: PaymentProductType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  creditAmount: number;
  creditGranted: boolean;
  isTestMode: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface UserEntitlements {
  userId: string;
  weeklyFreeAnalysisAvailable: boolean;
  freeAnalysesRemaining: number;
  paidAnalysisCredits: number;
  canAnalyze: boolean;
  nextFreeResetDate: string;
  lastFreeResetAt: string;
  testMode: boolean;
  paidAnalysisPriceUsd: number;
  priceDisplay: string;
  isUnlimitedTestingAccount?: boolean;
}

export interface CreatePaymentParams {
  userId: string;
  userEmail?: string;
  displayName?: string;
  phoneNumber?: string;
  countryCode?: string;
  amount: number;
  currency: string;
  productType: PaymentProductType;
  isTestMode: boolean;
  callbackUrl?: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  provider: PaymentProviderType;
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  instructions?: string;
  isTestMode: boolean;
}

export interface VerifyPaymentResult {
  paymentId: string;
  providerTransactionId: string;
  status: PaymentStatus;
  creditGranted: boolean;
  amount: number;
  currency: string;
  failureReason?: string;
}

export interface WebhookResult {
  handled: boolean;
  paymentId?: string;
  providerTransactionId?: string;
  status?: PaymentStatus;
  message?: string;
}

export interface PaymentProvider {
  readonly name: PaymentProviderType;
  readonly displayName: string;
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
  verifyPayment(paymentId: string, providerTransactionId?: string, simulateAction?: 'success' | 'fail' | 'cancel'): Promise<VerifyPaymentResult>;
  handleWebhook(payload: any, headers?: Record<string, any>): Promise<WebhookResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  refundPayment?(paymentId: string, reason?: string): Promise<{ success: boolean; message: string }>;
}

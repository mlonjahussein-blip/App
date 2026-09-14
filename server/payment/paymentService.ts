import {
  PaymentProviderType,
  PaymentRecord,
  PaymentStatus,
  UserEntitlements,
  CreatePaymentResult,
  VerifyPaymentResult,
  AnalysisCreditType
} from './types.ts';
import { getPaymentConfig } from './config.ts';
import { getPaymentProvider } from './providers/index.ts';

const PROJECT_ID = 'emergent-fastness-8lcf1';
const DB_ID = 'ai-studio-efootballaihub-2a95eb9f-c78b-4ee5-ae97-a914c4288cba';
const API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAUe9kMRkqAG_VshpucovSWslYeBcofqZY';
const BASE_REST_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DB_ID}/documents`;

/**
 * Converts standard JS object to Firestore REST API format
 */
function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === 'string') {
      fields[key] = { stringValue: value };
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === 'boolean') {
      fields[key] = { booleanValue: value };
    }
  }
  return fields;
}

/**
 * Converts Firestore REST document to standard JS object
 */
function fromFirestoreDoc(docData: any): any {
  if (!docData || !docData.fields) return null;
  const result: any = {};
  for (const [key, val] of Object.entries(docData.fields as Record<string, any>)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.nullValue !== undefined) result[key] = null;
  }
  return result;
}

async function fetchFirestoreDoc(collection: string, docId: string): Promise<any> {
  try {
    const url = `${BASE_REST_URL}/${collection}/${encodeURIComponent(docId)}?key=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return fromFirestoreDoc(json);
  } catch (err) {
    console.warn(`[Payment DB] Error fetching ${collection}/${docId}:`, err);
    return null;
  }
}

async function writeFirestoreDoc(collection: string, docId: string, data: Record<string, any>): Promise<boolean> {
  try {
    const keys = Object.keys(data);
    const updateMaskParams = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const url = `${BASE_REST_URL}/${collection}/${encodeURIComponent(docId)}?${updateMaskParams}&key=${API_KEY}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: toFirestoreFields(data) })
    });
    return res.ok;
  } catch (err) {
    console.error(`[Payment DB] Error writing ${collection}/${docId}:`, err);
    return false;
  }
}

// In-memory fallback cache to ensure instant response & resilience
const fallbackUserStore: Map<string, { freeAnalysesRemaining: number; paidCredits: number; lastFreeResetAt: string }> = new Map();
const fallbackPaymentStore: Map<string, PaymentRecord> = new Map();

/**
 * Retrieve user entitlements (Free weekly analysis check + Paid credits)
 * Backend is the source of truth!
 */
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const config = getPaymentConfig();
  const cleanUid = (userId || 'guest').trim();

  let userDoc = await fetchFirestoreDoc('users', cleanUid);
  
  if (!userDoc) {
    const cached = fallbackUserStore.get(cleanUid);
    if (cached) {
      userDoc = cached;
    } else {
      userDoc = {
        freeAnalysesRemaining: 1,
        paidCredits: 0,
        lastFreeResetAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      };
      fallbackUserStore.set(cleanUid, userDoc);
    }
  }

  let freeAnalysesRemaining = typeof userDoc.freeAnalysesRemaining === 'number' ? userDoc.freeAnalysesRemaining : 1;
  let paidCredits = typeof userDoc.paidCredits === 'number' ? userDoc.paidCredits : 0;
  let lastFreeResetAt = userDoc.lastFreeResetAt || new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  // Weekly Free Analysis Reset Check (Every 7 days)
  const lastResetTime = new Date(lastFreeResetAt).getTime();
  const now = Date.now();
  const sevenDaysMs = config.freeAnalysisIntervalDays * 24 * 60 * 60 * 1000;

  if (now - lastResetTime >= sevenDaysMs) {
    if (freeAnalysesRemaining < 1) {
      freeAnalysesRemaining = 1;
      lastFreeResetAt = new Date().toISOString();
      // Persist reset to Firestore
      await writeFirestoreDoc('users', cleanUid, {
        freeAnalysesRemaining: 1,
        lastFreeResetAt,
        updatedAt: new Date().toISOString()
      });
      fallbackUserStore.set(cleanUid, { freeAnalysesRemaining, paidCredits, lastFreeResetAt });
    }
  }

  const weeklyFreeAnalysisAvailable = freeAnalysesRemaining > 0;
  const canAnalyze = weeklyFreeAnalysisAvailable || paidCredits > 0;
  const nextFreeResetDate = new Date(lastResetTime + sevenDaysMs).toISOString();

  return {
    userId: cleanUid,
    weeklyFreeAnalysisAvailable,
    freeAnalysesRemaining,
    paidAnalysisCredits: paidCredits,
    canAnalyze,
    nextFreeResetDate,
    lastFreeResetAt,
    testMode: config.isTestMode,
    paidAnalysisPriceUsd: config.priceUsd,
    priceDisplay: config.priceDisplay
  };
}

/**
 * Server-side check & consumption of analysis entitlement before executing AI analysis
 */
export async function consumeEntitlementForAnalysis(
  userId: string
): Promise<{ allowed: boolean; analysisType?: AnalysisCreditType; error?: string }> {
  const cleanUid = (userId || 'guest').trim();
  const entitlements = await getUserEntitlements(cleanUid);

  if (!entitlements.canAnalyze) {
    return {
      allowed: false,
      error: 'Your weekly free analysis has been used. Please purchase an additional analysis to continue.'
    };
  }

  // Priority 1: Free weekly analysis
  if (entitlements.weeklyFreeAnalysisAvailable) {
    const updated = {
      freeAnalysesRemaining: 0,
      lastFreeResetAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await writeFirestoreDoc('users', cleanUid, updated);
    fallbackUserStore.set(cleanUid, {
      freeAnalysesRemaining: 0,
      paidCredits: entitlements.paidAnalysisCredits,
      lastFreeResetAt: updated.lastFreeResetAt
    });
    return { allowed: true, analysisType: 'FREE_WEEKLY' };
  }

  // Priority 2: Paid analysis credit
  if (entitlements.paidAnalysisCredits > 0) {
    const updatedCredits = entitlements.paidAnalysisCredits - 1;
    await writeFirestoreDoc('users', cleanUid, {
      paidCredits: updatedCredits,
      updatedAt: new Date().toISOString()
    });
    fallbackUserStore.set(cleanUid, {
      freeAnalysesRemaining: 0,
      paidCredits: updatedCredits,
      lastFreeResetAt: entitlements.lastFreeResetAt
    });
    return { allowed: true, analysisType: 'PAID_CREDIT' };
  }

  return {
    allowed: false,
    error: 'No analysis credit available.'
  };
}

/**
 * Create a new Payment Order / Intent
 */
export async function createPaymentOrder(params: {
  userId: string;
  provider: PaymentProviderType;
  userEmail?: string;
  displayName?: string;
  phoneNumber?: string;
  countryCode?: string;
  callbackUrl?: string;
}): Promise<CreatePaymentResult> {
  const config = getPaymentConfig();
  const cleanUid = (params.userId || 'guest').trim();
  const provider = getPaymentProvider(params.provider);

  const paymentCreation = await provider.createPayment({
    userId: cleanUid,
    userEmail: params.userEmail,
    displayName: params.displayName,
    phoneNumber: params.phoneNumber,
    countryCode: params.countryCode,
    amount: config.priceUsd,
    currency: config.currency,
    productType: 'single_analysis',
    isTestMode: config.isTestMode,
    callbackUrl: params.callbackUrl
  });

  const now = new Date().toISOString();
  const paymentRecord: PaymentRecord = {
    id: paymentCreation.paymentId,
    userId: cleanUid,
    provider: params.provider,
    providerTransactionId: paymentCreation.providerTransactionId,
    productType: 'single_analysis',
    amount: config.priceUsd,
    currency: config.currency,
    status: 'PENDING',
    creditAmount: 1,
    creditGranted: false,
    isTestMode: config.isTestMode,
    createdAt: now,
    updatedAt: now
  };

  // Persist record to Firestore
  await writeFirestoreDoc('paymentRecords', paymentRecord.id, paymentRecord);
  fallbackPaymentStore.set(paymentRecord.id, paymentRecord);

  return paymentCreation;
}

/**
 * Verify and complete payment, granting 1 AI analysis credit.
 * Strictly enforces IDEMPOTENCY to prevent double credits.
 */
export async function verifyAndCompletePayment(
  paymentId: string,
  simulateAction: 'success' | 'fail' | 'cancel' = 'success',
  providerTransactionId?: string
): Promise<VerifyPaymentResult> {
  const config = getPaymentConfig();
  const cleanId = (paymentId || '').trim();

  let paymentRecord: PaymentRecord | null = await fetchFirestoreDoc('paymentRecords', cleanId);
  if (!paymentRecord) {
    paymentRecord = fallbackPaymentStore.get(cleanId) || null;
  }

  if (!paymentRecord) {
    throw new Error(`Payment record with ID ${cleanId} not found.`);
  }

  // --- IDEMPOTENCY CHECK ---
  // If payment has already been verified and credit was granted, return immediately without re-crediting!
  if (paymentRecord.status === 'SUCCESS' && paymentRecord.creditGranted) {
    console.log(`[Payment Idempotency] Payment ${cleanId} already completed and credit granted. Skipping double credit.`);
    return {
      paymentId: cleanId,
      providerTransactionId: paymentRecord.providerTransactionId,
      status: 'SUCCESS',
      creditGranted: true,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency
    };
  }

  const provider = getPaymentProvider(paymentRecord.provider);
  const verifyResult = await provider.verifyPayment(cleanId, providerTransactionId || paymentRecord.providerTransactionId, simulateAction);

  const now = new Date().toISOString();

  if (verifyResult.status === 'SUCCESS') {
    // 1. Mark payment record as SUCCESS and creditGranted = true
    paymentRecord.status = 'SUCCESS';
    paymentRecord.creditGranted = true;
    paymentRecord.completedAt = now;
    paymentRecord.updatedAt = now;

    await writeFirestoreDoc('paymentRecords', cleanId, paymentRecord);
    fallbackPaymentStore.set(cleanId, paymentRecord);

    // 2. Grant 1 paid credit to user in Firestore
    const userDoc = await fetchFirestoreDoc('users', paymentRecord.userId) || { paidCredits: 0 };
    const currentPaidCredits = typeof userDoc.paidCredits === 'number' ? userDoc.paidCredits : 0;
    const newPaidCredits = currentPaidCredits + 1;

    await writeFirestoreDoc('users', paymentRecord.userId, {
      paidCredits: newPaidCredits,
      updatedAt: now
    });

    const cachedUser = fallbackUserStore.get(paymentRecord.userId);
    if (cachedUser) {
      cachedUser.paidCredits = newPaidCredits;
      fallbackUserStore.set(paymentRecord.userId, cachedUser);
    } else {
      fallbackUserStore.set(paymentRecord.userId, {
        freeAnalysesRemaining: typeof userDoc.freeAnalysesRemaining === 'number' ? userDoc.freeAnalysesRemaining : 1,
        paidCredits: newPaidCredits,
        lastFreeResetAt: userDoc.lastFreeResetAt || now
      });
    }

    return {
      ...verifyResult,
      status: 'SUCCESS',
      creditGranted: true
    };
  } else {
    // FAILED or CANCELLED
    paymentRecord.status = verifyResult.status;
    paymentRecord.creditGranted = false;
    paymentRecord.failureReason = verifyResult.failureReason || 'Payment not completed';
    paymentRecord.updatedAt = now;

    await writeFirestoreDoc('paymentRecords', cleanId, paymentRecord);
    fallbackPaymentStore.set(cleanId, paymentRecord);

    return {
      ...verifyResult,
      status: verifyResult.status,
      creditGranted: false
    };
  }
}

/**
 * Retrieve payment history for a user
 */
export async function getPaymentHistory(userId: string): Promise<PaymentRecord[]> {
  const cleanUid = (userId || 'guest').trim();
  const records: PaymentRecord[] = [];

  try {
    // Query Firestore REST API for paymentRecords where userId == cleanUid
    const queryUrl = `${BASE_REST_URL}:runQuery?key=${API_KEY}`;
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: 'paymentRecords' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'userId' },
            op: 'EQUAL',
            value: { stringValue: cleanUid }
          }
        },
        orderBy: [
          {
            field: { fieldPath: 'createdAt' },
            direction: 'DESCENDING'
          }
        ],
        limit: 50
      }
    };

    const res = await fetch(queryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody)
    });

    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results)) {
        for (const item of results) {
          if (item.document) {
            const parsed = fromFirestoreDoc(item.document);
            if (parsed && parsed.id) {
              records.push(parsed as PaymentRecord);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Payment History] Error querying Firestore:', err);
  }

  // Combine with in-memory fallback records if any
  for (const r of fallbackPaymentStore.values()) {
    if (r.userId === cleanUid && !records.some((existing) => existing.id === r.id)) {
      records.unshift(r);
    }
  }

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Developer / Test Helper: Reset weekly free analysis for test user
 * Only permitted when PAYMENT_TEST_MODE is true!
 */
export async function resetUserFreeAnalysisForTesting(userId: string): Promise<{ success: boolean; message: string }> {
  const config = getPaymentConfig();
  if (!config.isTestMode) {
    throw new Error('Test reset controls are strictly disabled in production mode.');
  }

  const cleanUid = (userId || 'guest').trim();
  const pastResetDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

  await writeFirestoreDoc('users', cleanUid, {
    freeAnalysesRemaining: 1,
    lastFreeResetAt: pastResetDate,
    updatedAt: new Date().toISOString()
  });

  const cached = fallbackUserStore.get(cleanUid) || { paidCredits: 0 };
  fallbackUserStore.set(cleanUid, {
    freeAnalysesRemaining: 1,
    paidCredits: cached.paidCredits,
    lastFreeResetAt: pastResetDate
  });

  return {
    success: true,
    message: 'Free weekly analysis successfully reset for testing.'
  };
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createPaymentOrder,
  verifyAndCompletePayment,
  getPaymentHistory,
  resetUserFreeAnalysisForTesting,
  handlePaymentWebhook
} from '../payment/paymentService.ts';
import { getPaymentConfig } from '../payment/config.ts';
import { applySecurityHeaders, checkRateLimit, getClientIp } from '../rateLimiter.ts';

function getAction(req: VercelRequest): string {
  if (req.query?.action) {
    const act = Array.isArray(req.query.action) ? req.query.action[0] : String(req.query.action);
    if (act) return act.toLowerCase().trim();
  }
  const cleanUrl = (req.url || '').split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last !== 'payment') {
    return last.toLowerCase().trim();
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientIp = getClientIp(req);
  const action = getAction(req);

  try {
    // 1. /api/payment/create
    if (action === 'create') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

      // Rate limit: max 15 payment creation attempts per 5 minutes per IP
      const rateLimit = checkRateLimit(`pay_create:${clientIp}`, 15, 5 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many payment requests. Please wait ${rateLimit.retryAfterSec} seconds before trying again.`
        });
      }

      const { userId, provider, userEmail, displayName, phoneNumber, countryCode, paymentType, callbackUrl } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const effectiveProvider = provider || 'blmpay';
      const order = await createPaymentOrder({
        userId,
        provider: effectiveProvider,
        userEmail,
        displayName,
        phoneNumber,
        countryCode,
        paymentType,
        callbackUrl
      });
      return res.status(200).json({ success: true, order });
    }

    // 2. /api/payment/verify
    if (action === 'verify') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }

      // Rate limit: max 30 verification checks per 5 minutes
      const rateLimit = checkRateLimit(`pay_verify:${clientIp}`, 30, 5 * 60 * 1000);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: `Too many verification requests. Please wait ${rateLimit.retryAfterSec} seconds.`
        });
      }

      const { paymentId, providerTransactionId, simulateAction } = req.body || {};
      if (!paymentId) {
        return res.status(400).json({ error: 'paymentId is required.' });
      }

      const config = getPaymentConfig();
      // In production mode, ignore any client-requested simulateAction to prevent fraud!
      const effectiveSimulate = config.isTestMode ? (simulateAction || 'success') : 'success';

      const result = await verifyAndCompletePayment(
        paymentId,
        effectiveSimulate,
        providerTransactionId
      );
      return res.status(200).json({ success: result.status === 'SUCCESS', result });
    }

    // 3. /api/payment/webhook or /api/payment/webhook/blmpay
    if (action === 'webhook' || action === 'blmpay') {
      const result = await handlePaymentWebhook(req.body, req.headers, 'blmpay');
      return res.status(200).json(result);
    }

    // 4. /api/payment/history
    if (action === 'history') {
      const userId = (req.query.userId as string) || 'guest';
      const history = await getPaymentHistory(userId);
      return res.status(200).json({ success: true, history });
    }

    // 5. /api/payment/test-reset-free
    if (action === 'test-reset-free') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }
      const config = getPaymentConfig();
      if (!config.isTestMode) {
        return res.status(403).json({ error: 'Testing endpoints are strictly disabled in production mode.' });
      }
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const result = await resetUserFreeAnalysisForTesting(userId);
      return res.status(200).json(result);
    }

    return res.status(404).json({
      error: `Unknown payment action: "${action}". Valid actions: create, verify, webhook, history, test-reset-free.`
    });
  } catch (err: any) {
    console.error(`API Error in /api/payment/${action}:`, err);
    return res.status(500).json({ success: false, error: err?.message || 'Payment server error' });
  }
}

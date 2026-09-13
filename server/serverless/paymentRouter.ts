import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createPaymentOrder,
  verifyAndCompletePayment,
  getPaymentHistory,
  resetUserFreeAnalysisForTesting
} from '../payment/paymentService.ts';

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
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = getAction(req);

  try {
    // 1. /api/payment/create
    if (action === 'create') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }
      const { userId, provider, userEmail, displayName } = req.body || {};
      if (!userId || !provider) {
        return res.status(400).json({ error: 'userId and provider are required.' });
      }
      const order = await createPaymentOrder({
        userId,
        provider,
        userEmail,
        displayName
      });
      return res.status(200).json({ success: true, order });
    }

    // 2. /api/payment/verify
    if (action === 'verify') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }
      const { paymentId, providerTransactionId, simulateAction } = req.body || {};
      if (!paymentId) {
        return res.status(400).json({ error: 'paymentId is required.' });
      }
      const result = await verifyAndCompletePayment(
        paymentId,
        simulateAction || 'success',
        providerTransactionId
      );
      return res.status(200).json({ success: result.status === 'SUCCESS', result });
    }

    // 3. /api/payment/history
    if (action === 'history') {
      const userId = (req.query.userId as string) || 'guest';
      const history = await getPaymentHistory(userId);
      return res.status(200).json({ success: true, history });
    }

    // 4. /api/payment/test-reset-free
    if (action === 'test-reset-free') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
      }
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: 'userId is required.' });
      }
      const result = await resetUserFreeAnalysisForTesting(userId);
      return res.status(200).json(result);
    }

    return res.status(404).json({
      error: `Unknown payment action: "${action}". Valid actions: create, verify, history, test-reset-free.`
    });
  } catch (err: any) {
    console.error(`API Error in /api/payment/${action}:`, err);
    return res.status(500).json({ success: false, error: err?.message || 'Payment server error' });
  }
}

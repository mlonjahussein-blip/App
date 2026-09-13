import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAndCompletePayment } from '../payment/paymentService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
  } catch (err: any) {
    console.error('API Error in /api/payment/verify:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to verify payment' });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resetUserFreeAnalysisForTesting } from '../payment/paymentService.ts';

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
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' });
    }

    const result = await resetUserFreeAnalysisForTesting(userId);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('API Error in /api/payment/test-reset-free:', err);
    return res.status(400).json({ success: false, error: err?.message || 'Failed to reset free analysis' });
  }
}

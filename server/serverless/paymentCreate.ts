import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPaymentOrder } from '../payment/paymentService.ts';

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
  } catch (err: any) {
    console.error('API Error in /api/payment/create:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to create payment order' });
  }
}

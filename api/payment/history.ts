import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPaymentHistory } from '../../server/payment/paymentService.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = (req.query.userId as string) || 'guest';
  try {
    const history = await getPaymentHistory(userId);
    return res.status(200).json({ success: true, history });
  } catch (err: any) {
    console.error('API Error in /api/payment/history:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch payment history' });
  }
}

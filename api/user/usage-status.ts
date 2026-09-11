import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const userId = (req.query.userId as string) || 'guest';
  return res.status(200).json({
    userId,
    freeAnalysesRemaining: 1,
    paidCredits: 0,
    paidAnalysisEnabled: false,
    paymentStatusNotice: 'Paid analysis is currently unavailable while we prepare the payment system. Enjoy your weekly free analysis!',
    nextFreeResetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
}

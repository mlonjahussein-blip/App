import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserEntitlements } from '../payment/paymentService.ts';

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
    const entitlements = await getUserEntitlements(userId);
    return res.status(200).json({
      userId,
      freeAnalysesRemaining: entitlements.freeAnalysesRemaining,
      paidCredits: entitlements.paidAnalysisCredits,
      paidAnalysisEnabled: true,
      canAnalyze: entitlements.canAnalyze,
      testMode: entitlements.testMode,
      priceUsd: entitlements.paidAnalysisPriceUsd,
      priceDisplay: entitlements.priceDisplay,
      nextFreeResetDate: entitlements.nextFreeResetDate
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch usage status' });
  }
}

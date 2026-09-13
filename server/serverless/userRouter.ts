import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserEntitlements } from '../payment/paymentService.ts';

function getAction(req: VercelRequest): string {
  if (req.query?.action) {
    const act = Array.isArray(req.query.action) ? req.query.action[0] : String(req.query.action);
    if (act) return act.toLowerCase().trim();
  }
  const cleanUrl = (req.url || '').split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);
  const last = parts[parts.length - 1];
  if (last && last !== 'user') {
    return last.toLowerCase().trim();
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = getAction(req);
  const userId = (req.query.userId as string) || 'guest';

  try {
    const entitlements = await getUserEntitlements(userId);

    // 1. /api/user/entitlements
    if (action === 'entitlements' || action === '') {
      return res.status(200).json(entitlements);
    }

    // 2. /api/user/usage-status
    if (action === 'usage-status') {
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
    }

    return res.status(404).json({
      error: `Unknown user action: "${action}". Valid actions: entitlements, usage-status.`
    });
  } catch (err: any) {
    console.error(`API Error in /api/user/${action}:`, err);
    return res.status(500).json({ error: err?.message || 'Failed to query user status' });
  }
}

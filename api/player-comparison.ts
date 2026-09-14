import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applySecurityHeaders, checkRateLimit, getClientIp } from '../server/rateLimiter.ts';

export const maxDuration = 10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`player_comp:${clientIp}`, 30, 5 * 60 * 1000);
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: `Too many comparison requests. Please wait ${rateLimit.retryAfterSec} seconds.` });
  }

  try {
    const { players, playstyle } = req.body || {};
    if (!Array.isArray(players) || players.length < 2) {
      return res.status(400).json({ error: 'At least 2 players are required for comparison.' });
    }

    const p1 = players[0];
    const p2 = players[1];

    const winner = (p1.rating || 85) >= (p2.rating || 85) ? p1 : p2;
    const runnerUp = winner === p1 ? p2 : p1;

    return res.status(200).json({
      success: true,
      comparison: {
        playerA: p1,
        playerB: p2,
        recommendation: {
          winnerName: winner.name,
          verdict: `${winner.name} is the superior choice for your ${playstyle || 'current'} tactical system.`,
          detailedReasoning: `${winner.name} offers higher rating (${winner.rating || 85}) and greater role suitability as ${winner.playstyle || 'specialist'}, enabling tighter defensive cover and more clinical transition execution compared to ${runnerUp.name}.`
        }
      }
    });
  } catch (error: any) {
    return res.status(200).json({
      success: false,
      error: error?.message || 'Failed to compare players.'
    });
  }
}

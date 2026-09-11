import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({
    status: 'ok',
    service: 'eFootball AI Hub API',
    timestamp: new Date().toISOString(),
    paymentStatus: 'disabled_development'
  });
}

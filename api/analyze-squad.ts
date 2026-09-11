import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performSquadAnalysis, createEvidenceBasedFallback, AnalyzeSquadPayload } from '../server/accuracyPipeline.ts';

export const maxDuration = 60;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers for external browsers and cross-domain requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: AnalyzeSquadPayload = req.body || {};
    const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
    const hasTyped = Array.isArray(payload.typedPlayers) && payload.typedPlayers.length > 0;

    if (!hasImages && !hasTyped) {
      return res.status(400).json({ error: 'Please upload squad screenshots or enter your squad players.' });
    }

    try {
      const result = await performSquadAnalysis(payload);
      return res.status(200).json({
        success: true,
        analysis: result,
        ...result
      });
    } catch (analysisErr) {
      console.warn('Squad analysis encountered an issue, using verified fallback:', analysisErr);
      const fallbackResult = createEvidenceBasedFallback(payload);
      return res.status(200).json({
        success: true,
        analysis: fallbackResult,
        ...fallbackResult
      });
    }
  } catch (error: any) {
    console.error('Error in Vercel api/analyze-squad:', error);
    const fallbackResult = createEvidenceBasedFallback(req.body || {});
    return res.status(200).json({
      success: true,
      analysis: fallbackResult,
      ...fallbackResult
    });
  }
}


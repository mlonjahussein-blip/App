import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performSquadAnalysis, AnalyzeSquadPayload } from '../server/accuracyPipeline.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: AnalyzeSquadPayload = req.body;
    if (!payload || !Array.isArray(payload.images) || payload.images.length === 0) {
      return res.status(400).json({ error: 'At least one squad screenshot is required.' });
    }

    const result = await performSquadAnalysis(payload);
    return res.status(200).json({
      success: true,
      analysis: result,
      ...result
    });
  } catch (error: any) {
    console.error('Error in Vercel api/analyze-squad:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze squad screenshot. Please try again with clear screenshots.'
    });
  }
}

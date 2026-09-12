import type { VercelRequest, VercelResponse } from '@vercel/node';
import { performSquadAnalysis, createEvidenceBasedFallback, AnalyzeSquadPayload } from './accuracyPipeline.ts';

export const maxDuration = 60;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
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
    
    // Validate Input
    if (!payload) {
      console.error('ANALYZE_FAILED: No payload');
      return res.status(400).json({ success: false, errorCode: 'INVALID_REQUEST', message: 'Missing request body' });
    }

    const hasImages = Array.isArray(payload.images) && payload.images.length > 0;
    const hasTyped = Array.isArray(payload.typedPlayers) && payload.typedPlayers.length > 0;

    if (!hasImages && !hasTyped) {
      console.error('ANALYZE_FAILED: No input provided');
      return res.status(400).json({ success: false, errorCode: 'INVALID_INPUT', message: 'Please upload squad screenshots or enter your squad players.' });
    }

    // Try Main Pipeline
    try {
      console.log('SQUAD_ANALYSIS_STARTED');
      const result = await performSquadAnalysis(payload);
      console.log('ANALYSIS_COMPLETED');
      return res.status(200).json({
        success: true,
        analysis: result,
        ...result
      });
    } catch (analysisErr: any) {
      console.error('ANALYSIS_FAILED: Main pipeline error', { message: analysisErr.message });
      
      // Try Fallback
      try {
        console.log('FALLBACK_STARTED');
        const fallbackResult = createEvidenceBasedFallback(payload);
        return res.status(200).json({
          success: true,
          analysis: fallbackResult,
          ...fallbackResult
        });
      } catch (fallbackErr: any) {
        console.error('FALLBACK_FAILED: Secondary fallback error', { message: fallbackErr.message });
        return res.status(500).json({ 
          success: false, 
          errorCode: 'PIPELINE_CRITICAL_FAILURE', 
          message: 'The analysis service is temporarily unavailable.' 
        });
      }
    }
  } catch (fatalError: any) {
    console.error('CRITICAL_FATAL_ERROR', { message: fatalError.message });
    return res.status(500).json({ 
      success: false, 
      errorCode: 'INTERNAL_SERVER_ERROR', 
      message: 'An unexpected error occurred during analysis.' 
    });
  }
}
